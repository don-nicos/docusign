package com.docusing.signature.core.service

import com.docusing.signature.common.dto.request.CreateSignatureRequestDto
import com.docusing.signature.common.dto.request.SignerInputDto
import com.docusing.signature.common.dto.response.PdfVersionResponse
import com.docusing.signature.config.FrontendProperties
import com.docusing.signature.config.SignatureProperties
import com.docusing.signature.domain.model.SignaturePositionEntity
import com.docusing.signature.domain.model.SignatureRequestEntity
import com.docusing.signature.domain.model.SignatureRequestStatus
import com.docusing.signature.domain.model.SignerEntity
import com.docusing.signature.domain.model.SignerStatus
import com.docusing.signature.domain.repository.SignatureRequestRepository
import com.docusing.signature.domain.repository.SignerRepository
import org.springframework.data.domain.PageRequest
import com.docusing.signature.apis.client.NotificationFeignClient
import com.docusing.signature.apis.client.MagicLinkEmailRequest
import com.docusing.signature.apis.client.SignatureCompletedRequest
import com.docusing.signature.apis.client.DocumentFeignClient
import com.docusing.signature.apis.client.ByteArrayMultipartFile
import com.docusing.signature.apis.client.PaymentFeignClient
import com.docusing.signature.apis.client.AuthFeignClient
import com.docusing.signature.infrastructure.storage.SignatureImageStorage
import com.docusing.signature.infrastructure.pdf.PDFSignatureInserter
import com.docusing.signature.infrastructure.pdf.SignatureData
import com.docusing.signature.core.service.AuditLogService
import com.docusing.signature.core.exception.*
import java.security.MessageDigest
import java.time.Clock
import java.time.Instant
import java.time.Duration
import java.util.UUID
import mu.KotlinLogging
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.beans.factory.annotation.Value
import org.springframework.web.server.ResponseStatusException
import java.io.InputStream

private val logger = KotlinLogging.logger {}

data class SignedPdfDownloadData(
    val pdfBytes: ByteArray,
    val filename: String,
    val documentHash: String,
    val signaturesCountHeader: String,
    val isComplete: Boolean
)

sealed interface SignerInfoAuthResult {
    data class Authorized(
        val signer: SignerEntity,
        val authMethod: String
    ) : SignerInfoAuthResult

    data class TokenExpired(
        val expiredAt: Instant
    ) : SignerInfoAuthResult

    data object Forbidden : SignerInfoAuthResult
}

data class PdfDownloadData(
    val pdfBytes: ByteArray,
    val filename: String,
    val documentHash: String? = null,
    val versionNumber: Int? = null,
    val signaturesCountHeader: String? = null,
    val isFinal: Boolean? = null
)

@Service
class SignatureService(
    private val signatureRequestRepository: SignatureRequestRepository,
    private val signerRepository: SignerRepository,
    private val pdfVersionRepository: com.docusing.signature.domain.repository.PdfVersionRepository,
    private val userSignatureRepository: com.docusing.signature.domain.repository.UserSignatureRepository,
    private val documentFeignClient: DocumentFeignClient,
    private val notificationFeignClient: NotificationFeignClient,
    private val paymentFeignClient: PaymentFeignClient,
    private val authFeignClient: AuthFeignClient,
    private val signatureImageStorage: SignatureImageStorage,
    private val signedPdfStorage: com.docusing.signature.infrastructure.storage.S3SignedPdfStorage,
    private val pdfSignatureInserter: PDFSignatureInserter,
    private val auditLogService: AuditLogService,
    private val frontendProperties: FrontendProperties,
    private val signatureProperties: SignatureProperties,
    private val rutValidator: com.docusing.signature.infrastructure.validation.RutValidator,
    private val clock: Clock,
    @Value("\${app.free-tier.max-documents:3}") private val freeTierMaxDocuments: Long
) {

    @Transactional(readOnly = true)
    fun authorizeSignerInfo(signerId: UUID, token: String?, userEmail: String?): SignerInfoAuthResult {
        val signer = getSigner(signerId)

        // Método 1: Magic link con token
        if (!token.isNullOrBlank()) {
            if (signer.accessToken != null && signer.accessToken == token) {
                val expiresAt = signer.accessTokenExpiresAt
                if (expiresAt != null && expiresAt.isBefore(Instant.now(clock))) {
                    return SignerInfoAuthResult.TokenExpired(expiresAt)
                }
                return SignerInfoAuthResult.Authorized(signer = signer, authMethod = "MAGIC_LINK")
            }
        }

        // Método 2: Usuario autenticado
        if (!userEmail.isNullOrBlank() && signer.email.equals(userEmail, ignoreCase = true)) {
            return SignerInfoAuthResult.Authorized(signer = signer, authMethod = "AUTHENTICATED_USER")
        }

        return SignerInfoAuthResult.Forbidden
    }

    private fun canDownloadAsSigner(signatureRequest: SignatureRequestEntity, userEmail: String?): Boolean {
        if (userEmail.isNullOrBlank()) return false
        return signatureRequest.signers.any { it.email.equals(userEmail, ignoreCase = true) }
    }

    private fun canAccessRequest(signatureRequest: SignatureRequestEntity, userId: String, userEmail: String?): Boolean {
        val isOwner = signatureRequest.ownerId.toString() == userId
        val isSigner = canDownloadAsSigner(signatureRequest, userEmail)
        return isOwner || isSigner
    }

    @Transactional(readOnly = true)
    fun listMySignatureRequestsForUser(userEmail: String?): List<SignatureRequestEntity> {
        if (userEmail.isNullOrBlank()) return emptyList()
        return listSignatureRequestsBySignerEmail(userEmail)
    }

    @Transactional(readOnly = true)
    fun buildSignedPdfDownload(requestId: UUID, userId: String, userEmail: String?): SignedPdfDownloadData {
        val signatureRequest = getSignatureRequest(requestId)
        if (!canAccessRequest(signatureRequest, userId, userEmail)) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN")
        }
        if (signatureRequest.signedPdfPath != null) {
            val signedCount = signatureRequest.signers.count { it.status == SignerStatus.SIGNED }
            val totalSigners = signatureRequest.signers.size
            val isComplete = signatureRequest.status == SignatureRequestStatus.COMPLETED
            val pdfBytes = getSignedPdfBytes(signatureRequest.signedPdfPath!!)
            val filename = if (isComplete) {
                "signed-${requestId}.pdf"
            } else {
                "partially-signed-${requestId}-${signedCount}of${totalSigners}.pdf"
            }
            return SignedPdfDownloadData(
                pdfBytes = pdfBytes,
                filename = filename,
                documentHash = signatureRequest.documentHash ?: "",
                signaturesCountHeader = "$signedCount/$totalSigners",
                isComplete = isComplete
            )
        }
        val originalPdf = getCurrentDocumentPdf(requestId)
        return SignedPdfDownloadData(
            pdfBytes = originalPdf,
            filename = "original-${requestId}.pdf",
            documentHash = signatureRequest.documentHash ?: "",
            signaturesCountHeader = "0/${signatureRequest.signers.size}",
            isComplete = false
        )
    }

    @Transactional
    fun createSignatureRequest(
        ownerId: UUID,
        request: CreateSignatureRequestDto,
        organizationId: UUID? = null
    ): SignatureRequestEntity {
        val documentCount = runCatching {
            documentFeignClient.countDocuments(ownerId.toString()).count
        }.getOrElse {
            throw ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "No se pudo validar el límite de documentos de tu cuenta"
            )
        }

        if (documentCount > freeTierMaxDocuments) {
            val subscriptionActive = runCatching {
                paymentFeignClient.getSubscriptionStatus(ownerId)
            }.getOrElse {
                throw ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "No se pudo validar el estado de la suscripción"
                )
            }
            if (!subscriptionActive.active) {
                throw ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Necesitas una suscripción activa para crear solicitudes de firma"
                )
            }
        }

        val documentId = UUID.fromString(request.documentId)
        
        val documentOwned = runCatching {
            documentFeignClient.getDocument(documentId, ownerId.toString())
            true
        }.getOrElse { false }
        if (!documentOwned) {
            throw SignatureRequestNotFoundException(documentId)
        }

        val expiresAt = request.expirationHours?.let {
            Instant.now(clock).plus(Duration.ofHours(it.toLong()))
        }

        // Capturar trace ID del contexto (viene del frontend via header X-Trace-Id)
        val traceId = com.docusing.signature.infrastructure.tracing.TraceIdInterceptor.getCurrentTraceId()

        val entity = SignatureRequestEntity(
            documentId = documentId,
            ownerId = ownerId,
            title = request.title,
            expiresAt = expiresAt,
            pdfViewerWidth = request.pdfViewerWidth,
            traceId = traceId,
            organizationId = organizationId,
            isOrganizationRequest = organizationId != null,
            magicLinkExpirationDays = request.magicLinkExpirationDays?.coerceIn(1, 30) ?: 7
        )
        
        logger.info { "Creando solicitud de firma con trace ID: $traceId" }

        request.signers.forEachIndexed { index, signerInput ->
            // Validar que el firmante tenga al menos una posición de firma
            if (signerInput.positions.isNullOrEmpty() && signerInput.signaturePage == null) {
                throw IllegalArgumentException(
                    "El firmante ${signerInput.fullName} debe tener al menos una posición de firma definida"
                )
            }
            
            // Validar RUT si se proporciona
            var rutToSave: String? = null
            var rutIsVerified = false
            
            if (!signerInput.rut.isNullOrBlank()) {
                if (rutValidator.isValid(signerInput.rut)) {
                    rutToSave = rutValidator.clean(signerInput.rut)
                    rutIsVerified = true
                    logger.info { "RUT válido para ${signerInput.email}: ${rutValidator.format(signerInput.rut)}" }
                } else {
                    logger.warn { "RUT inválido proporcionado para ${signerInput.email}: ${signerInput.rut}" }
                    // No guardamos RUT inválido
                }
            }
            
            val tokenExpiresAt = Instant.now(clock).plus(Duration.ofDays(entity.magicLinkExpirationDays.toLong()))
            
            val signer = SignerEntity(
                signatureRequest = entity,
                email = signerInput.email,
                fullName = signerInput.fullName,
                orderIndex = index + 1,
                status = SignerStatus.PENDING,
                rut = signerInput.rut,
                rutVerified = false,
                traceId = entity.traceId,
                accessToken = UUID.randomUUID().toString().replace("-", ""),
                accessTokenExpiresAt = tokenExpiresAt,
                // Campos legacy (deprecated)
                signaturePositionX = signerInput.signaturePositionX,
                signaturePositionY = signerInput.signaturePositionY,
                signaturePage = signerInput.signaturePage,
                signatureWidth = signerInput.signatureWidth,
                signatureHeight = signerInput.signatureHeight
            )
            
            // Si hay múltiples posiciones, crearlas
            if (!signerInput.positions.isNullOrEmpty()) {
                signerInput.positions.forEach { pos ->
                    val position = SignaturePositionEntity(
                        signer = signer,
                        pageNumber = pos.pageNumber,
                        positionX = pos.positionX,
                        positionY = pos.positionY,
                        width = pos.width,
                        height = pos.height,
                        label = pos.label
                    )
                    signer.signaturePositions.add(position)
                }
            } else if (signerInput.signaturePage != null) {
                // Si solo hay una posición (legacy), crear una SignaturePositionEntity
                val position = SignaturePositionEntity(
                    signer = signer,
                    pageNumber = signerInput.signaturePage,
                    positionX = signerInput.signaturePositionX ?: 100.0,
                    positionY = signerInput.signaturePositionY ?: 100.0,
                    width = signerInput.signatureWidth ?: 200.0,
                    height = signerInput.signatureHeight ?: 80.0
                )
                signer.signaturePositions.add(position)
            }
            
            entity.signers.add(signer)
        }

        val saved = signatureRequestRepository.save(entity)
        runCatching {
            documentFeignClient.lockDocument(documentId, ownerId.toString())
        }.onFailure { ex ->
            logger.warn(ex) { "Error al bloquear documento ${documentId}" }
        }
        logger.info { "Solicitud de firma ${saved.id} creada para documento ${request.documentId}" }

        // Guardar el PDF original como versión 0 antes de que se modifique
        runCatching {
            val originalPdfBytes = documentFeignClient.downloadPdf(documentId).body
                ?: throw IllegalStateException("No se pudo descargar el PDF original")
            
            val s3Key = signedPdfStorage.saveOriginalPdf(ownerId, saved.id!!, originalPdfBytes)
            val hash = generateDocumentHash(originalPdfBytes)
            
            val pdfVersion = com.docusing.signature.domain.model.PdfVersionEntity(
                signatureRequest = saved,
                versionNumber = 0,
                filePath = s3Key,
                documentHash = hash,
                signedBy = "Sistema",
                signerId = null,
                signaturesCount = 0,
                totalSigners = saved.signers.size,
                isFinal = false,
                hasCertificate = false,
                fileSizeBytes = originalPdfBytes.size.toLong()
            )
            pdfVersionRepository.save(pdfVersion)
            logger.info { "PDF original guardado como versión 0 para solicitud ${saved.id}" }
        }.onFailure { ex ->
            logger.error(ex) { "Error al guardar PDF original como versión 0 para solicitud ${saved.id}" }
        }

        // Enviar invitaciones (magic link) a los firmantes
        saved.signers.forEach { signer ->
            val magicLink = "${frontendProperties.baseUrl}/sign/${signer.id}?token=${signer.accessToken}"
            runCatching {
                notificationFeignClient.sendMagicLinkEmail(
                    MagicLinkEmailRequest(
                        email = signer.email,
                        fullName = signer.fullName,
                        magicLinkUrl = magicLink
                    )
                )
            }.onFailure { ex ->
                logger.warn(ex) { "No se pudo enviar la invitación a ${signer.email}" }
            }
        }
        return saved
    }

    @Transactional
    fun signDocument(signerId: UUID, providedOtp: String, ipAddress: String, userAgent: String): SignatureRequestEntity {
        val signer = signerRepository.findById(signerId)
            .orElseThrow { SignerNotFoundException(signerId) }
        val request = signer.signatureRequest

        if (request.status == SignatureRequestStatus.COMPLETED) {
            throw SignatureAlreadyCompletedException(request.id!!)
        }

        if (request.expiresAt?.isBefore(Instant.now(clock)) == true) {
            request.status = SignatureRequestStatus.EXPIRED
            signatureRequestRepository.save(request)
            throw SignatureExpiredException(request.id!!)
        }

        if (signatureProperties.enforceOrder && !isSignerTurn(signer)) {
            throw SignatureNotYourTurnException()
        }
        
        // VALIDACIÓN CRÍTICA: Verificar que la imagen de firma exista antes de firmar
        if (signer.signatureImagePath.isNullOrBlank()) {
            logger.error { "Attempt to sign without signature image for signer $signerId" }
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Debe subir una imagen de firma antes de firmar el documento"
            )
        }
        
        // Verificar que la imagen de firma exista físicamente
        try {
            val signaturePath = signatureImageStorage.getSignaturePath(signer.signatureImagePath!!)
            if (!signaturePath.toFile().exists()) {
                logger.error { "Signature image file not found for signer $signerId: ${signer.signatureImagePath}" }
                throw ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "La imagen de firma no se encuentra disponible. Por favor, vuelva a subirla."
                )
            }
        } catch (e: Exception) {
            logger.error(e) { "Error validating signature image for signer $signerId" }
            throw ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Error al validar la imagen de firma. Por favor, inténtelo nuevamente."
            )
        }

        // Firma directa sin OTP (OTP eliminado del sistema)
        val authMethod = "DIRECT"

        val now = Instant.now(clock)
        signer.status = SignerStatus.SIGNED
        signer.signedAt = now
        signer.signerIpAddress = ipAddress
        signer.signerUserAgent = userAgent
        signer.authenticationMethod = authMethod
        signerRepository.save(signer)

        if (request.status == SignatureRequestStatus.PENDING) {
            request.status = SignatureRequestStatus.IN_PROGRESS
        }

        // GENERAR PDF INCREMENTAL después de cada firma
        try {
            logger.info { "Generando versión incremental del PDF después de firma de ${signer.fullName}" }
            val isComplete = allSignersSigned(request)

            // El certificado necesita saber que la solicitud ya está completada
            if (isComplete) {
                request.completedAt = now
                // Forzar recálculo del hash en el certificado para el documento final firmado
                request.documentHash = null
            }

            val pdfBytes = generateSignedPdf(request.id!!, addCertificate = isComplete)

            // Calcular número de versión (cuenta cuántas versiones ya existen + 1)
            val existingVersionsCount = pdfVersionRepository.countBySignatureRequestId(request.id!!)
            val versionNumber = existingVersionsCount + 1
            val signedCount = request.signers.count { it.status == SignerStatus.SIGNED }
            val totalSigners = request.signers.size

            // El certificado ya calcula y persiste el hash del documento firmado (sin certificado).
            // Para firmas parciales lo calculamos aquí.
            val hash = if (isComplete) {
                request.documentHash ?: generateDocumentHash(pdfBytes)
            } else {
                generateDocumentHash(pdfBytes)
            }
            request.documentHash = hash

            // Guardar versión del PDF con número de versión en S3
            // Estructura:
            // - user/{ownerId}/{requestId}/v{version}.pdf (sin organización)
            // - org/{organizationId}/{subCompanyId|sin-empresa}/{requestId}/v{version}.pdf (con organización)
            val s3Key = signedPdfStorage.saveSignedPdf(
                ownerId = request.ownerId,
                requestId = request.id!!,
                versionNumber = versionNumber,
                pdfBytes = pdfBytes,
                organizationId = request.organizationId,
                subCompanyId = null
            )

            // Guardar registro de versión en BD
            val pdfVersion = com.docusing.signature.domain.model.PdfVersionEntity(
                signatureRequest = request,
                versionNumber = versionNumber,
                filePath = s3Key,
                documentHash = hash,
                signedBy = signer.fullName,
                signerId = signer.id,
                signaturesCount = signedCount,
                totalSigners = totalSigners,
                isFinal = isComplete,
                hasCertificate = isComplete,
                fileSizeBytes = pdfBytes.size.toLong()
            )
            pdfVersionRepository.save(pdfVersion)

            // Actualizar referencia a la última versión en la solicitud
            request.signedPdfPath = s3Key

            // Subir/actualizar el PDF visible en document-service tras cada firma,
            // así el firmante puede ver su firma en el documento inmediatamente.
            runCatching {
                val multipartFile = ByteArrayMultipartFile("file", "signed.pdf", "application/pdf", pdfBytes)
                documentFeignClient.uploadPdf(request.documentId, multipartFile)
            }.onFailure { ex ->
                logger.warn(ex) { "Error al subir PDF versionado del documento ${request.documentId}" }
            }

            logger.info { "PDF versión $versionNumber guardado en S3: $s3Key, firmas: $signedCount/$totalSigners, final: $isComplete, hash: $hash" }
        } catch (e: Exception) {
            logger.error(e) { "Error al generar PDF incremental después de firma" }
        }

        if (allSignersSigned(request)) {
            request.status = SignatureRequestStatus.COMPLETED
            request.completedAt = now

            // El PDF final ya fue generado arriba con certificado
            logger.info { "Todas las firmas completadas. PDF final ya guardado con certificado." }

            runCatching {
                val ownerEmail = runCatching {
                    authFeignClient.getUserById(request.ownerId)["email"] as? String
                }.getOrNull()
                notificationFeignClient.sendSignatureCompletedNotification(
                    SignatureCompletedRequest(
                        email = ownerEmail ?: request.ownerId.toString(),
                        documentTitle = request.title
                    )
                )
            }.onFailure { ex ->
                logger.warn(ex) { "Error al enviar notificación de firma completada" }
            }
        }

        // NO generar PDF intermedio - solo al final cuando todos hayan firmado

        val updated = signatureRequestRepository.save(request)
        logger.info { "Firmante ${signer.id} firmó documento ${request.documentId}" }
        return updated
    }

    @Transactional
    fun rejectSignature(signerId: UUID, reason: String?): SignatureRequestEntity {
        val signer = signerRepository.findById(signerId)
            .orElseThrow { SignerNotFoundException(signerId) }
        val request = signer.signatureRequest

        if (request.status == SignatureRequestStatus.COMPLETED) {
            throw SignatureAlreadyCompletedException(request.id!!)
        }

        signer.status = SignerStatus.REJECTED
        signer.rejectionReason = reason
        signerRepository.save(signer)

        request.status = SignatureRequestStatus.REJECTED
        val updated = signatureRequestRepository.save(request)
        logger.info { "Firmante ${signer.id} rechazó documento ${request.documentId}" }
        return updated
    }

    @Transactional(readOnly = true)
    fun getSignatureRequest(requestId: UUID): SignatureRequestEntity =
        signatureRequestRepository.findById(requestId)
            .orElseThrow { SignatureRequestNotFoundException(requestId) }

    @Transactional(readOnly = true)
    fun getSigner(signerId: UUID): SignerEntity =
        signerRepository.findById(signerId)
            .orElseThrow { SignerNotFoundException(signerId) }

    @Transactional(readOnly = true)
    fun listSignatureRequestsByOwner(ownerId: UUID): List<SignatureRequestEntity> =
        signatureRequestRepository.findAllByOwnerId(ownerId)

    @Transactional(readOnly = true)
    fun listSignatureRequestsByDocument(documentId: UUID): List<SignatureRequestEntity> =
        signatureRequestRepository.findAllByDocumentId(documentId)

    @Transactional(readOnly = true)
    fun listSignatureRequestsBySignerEmail(email: String): List<SignatureRequestEntity> {
        if (email.isBlank()) {
            return emptyList()
        }
        val signers = signerRepository.findByEmail(email.lowercase().trim())
        return signers.map { it.signatureRequest }.distinctBy { it.id }
    }
    
    @Transactional(readOnly = true)
    fun getUserSignaturesByUserId(userId: UUID): List<com.docusing.signature.domain.model.UserSignatureEntity> {
        return userSignatureRepository.findAllByUserId(userId)
    }
    
    @Transactional(readOnly = true)
    fun getUserSignaturesByEmail(email: String): List<com.docusing.signature.domain.model.UserSignatureEntity> {
        logger.debug { "Getting user signatures for email $email" }
        
        if (email.isBlank()) {
            return emptyList()
        }
        
        // Generar userId determinístico basado en email
        // Esto permite que invitados tengan firmas registradas antes de crear cuenta
        val userId = generateUserIdFromEmail(email)
        
        return userSignatureRepository.findAllByUserId(userId)
    }
    
    /**
     * Genera un UUID determinístico a partir de un email.
     * Esto permite que invitados tengan un userId consistente basado en su email,
     * y cuando creen una cuenta, el auth-service usará el mismo algoritmo.
     */
    private fun generateUserIdFromEmail(email: String): UUID {
        val normalizedEmail = email.lowercase().trim()
        // Usar UUID v5 (namespace-based) para generar ID determinístico
        // Namespace DNS UUID: 6ba7b810-9dad-11d1-80b4-00c04fd430c8
        val namespace = UUID.fromString("6ba7b810-9dad-11d1-80b4-00c04fd430c8")
        return UUID.nameUUIDFromBytes("$namespace:$normalizedEmail".toByteArray())
    }
    
    @Transactional
    fun saveUserSignatureByEmail(
        email: String,
        signatureDataUrl: String,
        name: String?,
        setAsDefault: Boolean
    ): com.docusing.signature.domain.model.UserSignatureEntity {
        logger.debug { "Saving user signature for email $email" }
        
        if (email.isBlank()) {
            throw IllegalArgumentException("Email cannot be blank")
        }
        
        if (!signatureDataUrl.startsWith("data:image/")) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Invalid signature data URL format"
            )
        }
        
        // Generar userId determinístico basado en email
        val userId = generateUserIdFromEmail(email)
        
        try {
            // Guardar imagen de firma
            val imagePath = signatureImageStorage.saveFromDataUrl(userId, signatureDataUrl)
            
            // Si se marca como default, quitar default de las demás firmas del usuario
            if (setAsDefault) {
                userSignatureRepository.findAllByUserId(userId).forEach {
                    it.isDefault = false
                    userSignatureRepository.save(it)
                }
            }
            
            // Crear nueva firma registrada
            val signature = com.docusing.signature.domain.model.UserSignatureEntity(
                userId = userId,
                signatureImagePath = imagePath,
                name = name,
                isDefault = setAsDefault
            )
            
            val saved = userSignatureRepository.save(signature)
            logger.info { "User signature saved for email $email (userId: $userId)" }
            
            // Audit
            runCatching {
                auditLogService.log(
                    entityType = "UserSignature",
                    entityId = saved.id!!,
                    action = "USER_SIGNATURE_SAVED",
                    actorId = userId,
                    metadataJson = "{\"email\":\"$email\",\"name\":\"${name ?: ""}\",\"isDefault\":$setAsDefault}"
                )
            }
            
            return saved
        } catch (e: IllegalArgumentException) {
            logger.error(e) { "Invalid signature data for email $email" }
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Invalid signature data. Please try again."
            )
        } catch (e: Exception) {
            logger.error(e) { "Error saving user signature for email $email" }
            throw ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Error saving signature. Please try again."
            )
        }
    }

    @Transactional(readOnly = true)
    fun listPdfVersionResponses(requestId: UUID, userId: String, userEmail: String?): List<PdfVersionResponse> {
        val signatureRequest = getSignatureRequest(requestId)
        if (!canAccessRequest(signatureRequest, userId, userEmail)) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN")
        }

        val versions = listPdfVersions(requestId)
        return versions.map { version ->
            val description = when {
                version.versionNumber == 0 -> "Original"
                version.isFinal -> "Firmado por ${version.signedBy} (Final con certificado)"
                else -> "Firmado por ${version.signedBy} (${version.signaturesCount}/${version.totalSigners})"
            }

            PdfVersionResponse(
                id = version.id!!,
                versionNumber = version.versionNumber,
                documentHash = version.documentHash,
                signedBy = version.signedBy,
                signerId = version.signerId,
                signaturesCount = version.signaturesCount,
                totalSigners = version.totalSigners,
                isFinal = version.isFinal,
                hasCertificate = version.hasCertificate,
                fileSizeBytes = version.fileSizeBytes,
                createdAt = version.createdAt!!,
                description = description
            )
        }
    }

    @Transactional(readOnly = true)
    fun buildPdfVersionDownload(requestId: UUID, versionNumber: Int, userId: String, userEmail: String?): PdfDownloadData {
        val signatureRequest = getSignatureRequest(requestId)
        if (!canAccessRequest(signatureRequest, userId, userEmail)) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN")
        }

        val version = getPdfVersion(requestId, versionNumber)

        if (version == null) {
            // Fallback: si se solicita la versión 0 (original) y aún no está versionada en BD,
            // devolvemos el PDF original directamente desde document-service.
            if (versionNumber == 0) {
                val originalPdfBytes = runCatching {
                    documentFeignClient.downloadPdf(signatureRequest.documentId).body
                        ?: throw IllegalStateException("No se pudo descargar el PDF")
                }.getOrElse { ex ->
                    logger.error(ex) { "Error al descargar PDF original del documento ${signatureRequest.documentId}" }
                    throw ResponseStatusException(HttpStatus.NOT_FOUND, "NOT_FOUND")
                }

                return PdfDownloadData(
                    pdfBytes = originalPdfBytes,
                    filename = "original-${requestId}.pdf",
                    documentHash = signatureRequest.documentHash,
                    versionNumber = 0,
                    signaturesCountHeader = "0/${signatureRequest.signers.size}",
                    isFinal = false
                )
            } else {
                throw ResponseStatusException(HttpStatus.NOT_FOUND, "NOT_FOUND")
            }
        }

        val pdfBytes = getPdfVersionBytes(requestId, versionNumber)
        val filename = when {
            version.versionNumber == 0 -> "original-${requestId}.pdf"
            version.isFinal -> "signed-${requestId}-final.pdf"
            else -> "signed-${requestId}-v${version.versionNumber}.pdf"
        }
        return PdfDownloadData(
            pdfBytes = pdfBytes,
            filename = filename,
            documentHash = version.documentHash,
            versionNumber = version.versionNumber,
            signaturesCountHeader = "${version.signaturesCount}/${version.totalSigners}",
            isFinal = version.isFinal
        )
    }

    private fun isSignerTurn(signer: SignerEntity): Boolean {
        val request = signer.signatureRequest
        val sortedSigners = request.signers.sortedBy { it.orderIndex }
        val currentIndex = signer.orderIndex

        for (i in 0 until currentIndex) {
            val previousSigner = sortedSigners[i]
            if (previousSigner.status != SignerStatus.SIGNED) {
                return false
            }
        }
        return true
    }

    private fun allSignersSigned(request: SignatureRequestEntity): Boolean =
        request.signers.all { it.status == SignerStatus.SIGNED }

    @Transactional
    fun uploadSignature(signerId: UUID, signatureDataUrl: String): String {
        logger.debug { "Uploading signature for signer $signerId" }
        
        val signer = signerRepository.findById(signerId)
            .orElseThrow { SignerNotFoundException(signerId) }
        
        // Validar que el firmante esté en estado PENDING
        if (signer.status != SignerStatus.PENDING) {
            logger.warn { "Attempt to upload signature for non-pending signer $signerId with status ${signer.status}" }
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "No se puede subir firma para un firmante que ya firmó o rechazó"
            )
        }
        
        // Validar formato del data URL
        if (!signatureDataUrl.startsWith("data:image/")) {
            logger.error { "Invalid signature data URL format for signer $signerId" }
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Formato de imagen inválido. Debe ser una imagen en formato data URL"
            )
        }

        try {
            // Guardar imagen de firma
            val imagePath = signatureImageStorage.saveFromDataUrl(signerId, signatureDataUrl)
            
            // Actualizar entidad del firmante
            signer.signatureImagePath = imagePath
            signerRepository.save(signer)

            logger.info { "Signature image saved for signer $signerId: $imagePath" }

            // Audit
            runCatching {
                auditLogService.log(
                    entityType = "Signer",
                    entityId = signer.id!!,
                    action = "SIGNATURE_IMAGE_UPLOADED",
                    actorId = signer.id,
                    metadataJson = "{\"path\":\"$imagePath\"}"
                )
            }

            return imagePath
        } catch (e: IllegalArgumentException) {
            logger.error(e) { "Invalid base64 data for signature upload, signer $signerId" }
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Datos de imagen inválidos. Por favor, inténtelo nuevamente."
            )
        } catch (e: Exception) {
            logger.error(e) { "Error saving signature image for signer $signerId" }
            throw ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Error al guardar la imagen de firma. Por favor, inténtelo nuevamente."
            )
        }
    }

    private fun generateDocumentHash(pdfBytes: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest(pdfBytes)
        return hashBytes.joinToString("") { "%02x".format(it) }
    }

    fun generateSignedPdf(requestId: UUID, addCertificate: Boolean = false): ByteArray {
        val signatureRequest = getSignatureRequest(requestId)
        logger.info { "Generando PDF con firmas para solicitud $requestId, documento ${signatureRequest.documentId}, certificado=$addCertificate" }

        val originalPdfBytes = runCatching {
            // Siempre partir del PDF original (versión 0) para evitar firmas duplicadas
            // cuando document-service ya contiene un PDF parcialmente firmado.
            val originalVersion = pdfVersionRepository.findBySignatureRequestIdAndVersionNumber(requestId, 0)
            if (originalVersion != null) {
                logger.info { "Cargando PDF original versión 0 para solicitud $requestId: ${originalVersion.filePath}" }
                signedPdfStorage.readBytes(originalVersion.filePath)
            } else {
                logger.warn { "No se encontró versión 0 para solicitud $requestId, descargando desde document-service como fallback" }
                documentFeignClient.downloadPdf(signatureRequest.documentId).body
                    ?: throw IllegalStateException("No se pudo descargar el PDF")
            }
        }.getOrElse { ex ->
            logger.error(ex) { "Error al descargar PDF original para solicitud $requestId" }
            throw ex
        }

        val signaturesData = mutableListOf<SignatureData>()
        signatureRequest.signers
            .filter { it.status == SignerStatus.SIGNED && it.signatureImagePath != null }
            .forEach { signer ->
                runCatching {
                    val signaturePath = signatureImageStorage.getSignaturePath(signer.signatureImagePath!!)
                    if (signer.signaturePositions.isNotEmpty()) {
                        // Sistema nuevo: múltiples posiciones
                        logger.info { "Firmante ${signer.fullName} tiene ${signer.signaturePositions.size} posiciones de firma" }
                        logger.info { "Ruta de imagen: $signaturePath, existe: ${signaturePath.toFile().exists()}" }
                        signer.signaturePositions.forEachIndexed { index, position ->
                            logger.info { "Agregando firma ${index + 1}/${signer.signaturePositions.size} en página ${position.pageNumber} posición (${position.positionX}, ${position.positionY}) tamaño ${position.width}x${position.height}" }
                            signaturesData.add(
                                SignatureData(
                                    signerId = signer.id.toString(),
                                    imagePath = signaturePath,
                                    pageNumber = position.pageNumber - 1, // Convertir de 1-indexed a 0-indexed
                                    x = position.positionX,
                                    y = position.positionY,
                                    width = position.width,
                                    height = position.height
                                )
                            )
                        }
                        logger.info { "Total de firmas agregadas para ${signer.fullName}: ${signer.signaturePositions.size}" }
                    } else if (signer.signaturePage != null) {
                        // Sistema legacy: una posición
                        signaturesData.add(
                            SignatureData(
                                signerId = signer.id.toString(),
                                imagePath = signaturePath,
                                pageNumber = (signer.signaturePage ?: 1) - 1, // Convertir de 1-indexed a 0-indexed
                                x = signer.signaturePositionX ?: 100.0,
                                y = signer.signaturePositionY ?: 100.0,
                                width = signer.signatureWidth ?: 200.0,
                                height = signer.signatureHeight ?: 80.0
                            )
                        )
                    } else {
                        // FALLBACK: Si no hay posición definida, usar posición por defecto
                        // Esto puede pasar con firmas antiguas o sin posicionamiento
                        logger.warn { "Firmante ${signer.fullName} no tiene posición definida, usando posición por defecto en esquina superior izquierda" }
                        signaturesData.add(
                            SignatureData(
                                signerId = signer.id.toString(),
                                imagePath = signaturePath,
                                pageNumber = 0, // Primera página
                                x = 50.0,  // Margen izquierdo
                                y = 50.0,  // Desde arriba (se convertirá automáticamente)
                                width = 200.0,
                                height = 80.0
                            )
                        )
                    }
                }.onFailure { ex ->
                    logger.error(ex) { "Error cargando firma de ${signer.fullName}" }
                }
            }

        if (signaturesData.isEmpty()) {
            logger.info { "No hay firmas para insertar en solicitud $requestId, retornando PDF original" }
            return originalPdfBytes
        }

        logger.info { "Total de firmas a insertar: ${signaturesData.size}" }
        
        return try {
            val signedPdfBytes = pdfSignatureInserter.insertMultipleSignatures(
                pdfInputStream = originalPdfBytes.inputStream(),
                signatures = signaturesData,
                signatureRequest = signatureRequest,
                addCertificate = addCertificate
            )

            logger.info { "PDF con ${signaturesData.size} firmas generado exitosamente para solicitud $requestId" }

            // Audit
            runCatching {
                auditLogService.log(
                    entityType = "SignatureRequest",
                    entityId = signatureRequest.id!!,
                    action = "PDF_GENERATED_WITH_SIGNATURES",
                    actorId = signatureRequest.ownerId,
                    metadataJson = "{\"signaturesCount\":${signaturesData.size}}"
                )
            }
            signedPdfBytes
        } catch (e: Exception) {
            logger.error(e) { "Error insertando firmas en PDF para solicitud $requestId, retornando PDF original" }
            originalPdfBytes
        }
    }

    @Transactional(readOnly = true)
    fun getCurrentDocumentPdf(signatureRequestId: UUID): ByteArray {
        val signatureRequest = getSignatureRequest(signatureRequestId)
        logger.info { "Descargando PDF actual del document-service para solicitud $signatureRequestId, documento ${signatureRequest.documentId}" }
        return documentFeignClient.downloadPdf(signatureRequest.documentId).body ?: throw IllegalStateException("No se pudo descargar el PDF")
    }
    
    /**
     * Obtiene los bytes del PDF firmado guardado
     * @param signedPdfPath Ruta del PDF firmado en el storage
     * @return Bytes del PDF firmado
     */
    fun getSignedPdfBytes(signedPdfPath: String): ByteArray {
        return signedPdfStorage.readBytes(signedPdfPath)
    }
    
    /**
     * Lista todas las versiones de PDF de una solicitud de firma
     */
    @Transactional(readOnly = true)
    fun listPdfVersions(requestId: UUID): List<com.docusing.signature.domain.model.PdfVersionEntity> {
        return pdfVersionRepository.findBySignatureRequestIdOrderByVersionNumberAsc(requestId)
    }
    
    /**
     * Obtiene una versión específica de PDF
     */
    @Transactional(readOnly = true)
    fun getPdfVersion(requestId: UUID, versionNumber: Int): com.docusing.signature.domain.model.PdfVersionEntity? {
        return pdfVersionRepository.findBySignatureRequestIdAndVersionNumber(requestId, versionNumber)
    }

    @Transactional
    fun backfillMissingOriginalVersions(batchSize: Int = 20): Int {
        val pageable = PageRequest.of(0, batchSize)
        val requests = signatureRequestRepository.findMissingOriginalVersion(pageable)
        if (requests.isEmpty()) {
            logger.debug { "No signature requests pending original backfill" }
            return 0
        }

        var migrated = 0
        requests.forEach { request ->
            val requestId = request.id ?: return@forEach
            val ownerId = request.ownerId

            if (pdfVersionRepository.existsBySignatureRequestIdAndVersionNumber(requestId, 0)) {
                return@forEach
            }

            if (request.signers.any { it.status != SignerStatus.PENDING }) {
                logger.debug { "Skipping backfill for request $requestId because it already has signed activity" }
                return@forEach
            }

            val pdfBytes = runCatching {
                documentFeignClient.downloadPdf(request.documentId).body
                    ?: throw IllegalStateException("Document payload missing")
            }.getOrElse { ex ->
                logger.warn(ex) { "Failed to download original PDF for request $requestId" }
                return@forEach
            }

            val s3Key = runCatching {
                signedPdfStorage.saveOriginalPdf(ownerId, requestId, pdfBytes)
            }.getOrElse { ex ->
                logger.error(ex) { "Error saving original PDF in S3 for request $requestId" }
                return@forEach
            }

            val pdfVersion = com.docusing.signature.domain.model.PdfVersionEntity(
                signatureRequest = request,
                versionNumber = 0,
                filePath = s3Key,
                documentHash = generateDocumentHash(pdfBytes),
                signedBy = "System (backfill)",
                signerId = null,
                signaturesCount = 0,
                totalSigners = request.signers.size,
                isFinal = false,
                hasCertificate = false,
                fileSizeBytes = pdfBytes.size.toLong()
            )

            runCatching { pdfVersionRepository.save(pdfVersion) }
                .onSuccess {
                    migrated += 1
                    logger.info { "Original PDF backfill created as version 0 for request $requestId" }
                }
                .onFailure { ex ->
                    logger.error(ex) { "Error persisting version 0 for request $requestId" }
                }
        }

        return migrated
    }

    /**
     * Obtiene los bytes de una versión específica de PDF
     */
    fun getPdfVersionBytes(requestId: UUID, versionNumber: Int): ByteArray {
        val version = getPdfVersion(requestId, versionNumber)
            ?: throw IllegalArgumentException("Version $versionNumber not found for request $requestId")
        return signedPdfStorage.readBytes(version.filePath)
    }
    
    
    
    /**
     * Regenera el magic link para un firmante
     * Solo puede ser ejecutado por el creador de la solicitud
     */
    @Transactional
    fun regenerateMagicLink(requestId: UUID, signerId: UUID, ownerId: UUID, expirationDays: Int? = null): String {
        val signatureRequest = getSignatureRequest(requestId)
        
        // Verificar que el usuario sea el creador
        if (signatureRequest.ownerId != ownerId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el creador puede regenerar magic links")
        }
        
        val signer = signerRepository.findById(signerId)
            .orElseThrow { SignerNotFoundException(signerId) }
            
        // Verificar que el signer pertenece a esta solicitud
        if (signer.signatureRequest.id != requestId) {
            throw IllegalArgumentException("El firmante no pertenece a esta solicitud")
        }
        
        // No permitir regenerar si ya firmó
        if (signer.status == SignerStatus.SIGNED) {
            throw IllegalArgumentException("No se puede regenerar el magic link de un firmante que ya firmó")
        }
        
        // Generar nuevo token y expiración
        val newToken = UUID.randomUUID().toString().replace("-", "")
        val daysToExpire = expirationDays?.coerceIn(1, 30) ?: signatureRequest.magicLinkExpirationDays
        val newExpiration = Instant.now(clock).plus(Duration.ofDays(daysToExpire.toLong()))
        
        signer.accessToken = newToken
        signer.accessTokenExpiresAt = newExpiration
        signerRepository.save(signer)
        
        // Enviar nuevo email con magic link
        val magicLink = "${frontendProperties.baseUrl}/sign/${signer.id}?token=${newToken}"
        
        try {
            notificationFeignClient.sendMagicLinkEmail(
                MagicLinkEmailRequest(
                    email = signer.email,
                    fullName = signer.fullName,
                    magicLinkUrl = magicLink
                )
            )
        } catch (e: Exception) {
            logger.error(e) { "Error al enviar email con nuevo magic link a ${signer.email}" }
            throw ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error al enviar email")
        }
        
        logger.info { "Magic link regenerado para signer $signerId, expira en $daysToExpire días: $newExpiration" }
        
        // Audit
        runCatching {
            auditLogService.log(
                entityType = "Signer",
                entityId = signer.id!!,
                action = "MAGIC_LINK_REGENERATED",
                actorId = ownerId,
                metadataJson = "{\"expirationDays\":$daysToExpire,\"expiresAt\":\"$newExpiration\"}"
            )
        }
        
        return magicLink
    }
}
