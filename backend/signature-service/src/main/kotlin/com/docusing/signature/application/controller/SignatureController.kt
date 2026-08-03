package com.docusing.signature.application.controller

import com.docusing.signature.common.dto.request.CreateSignatureRequestDto
import com.docusing.signature.common.dto.request.SignDocumentRequest
import com.docusing.signature.common.dto.response.*
import com.docusing.signature.common.mapper.SignatureMapper
import com.docusing.signature.common.web.ApiHeaders
import com.docusing.signature.common.web.ApiRoutes
import com.docusing.signature.common.web.ResponseMessages
import com.docusing.signature.core.service.SignatureService
import com.docusing.signature.core.service.SignerInfoAuthResult
import mu.KotlinLogging
import org.springframework.core.io.InputStreamResource
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

private val logger = KotlinLogging.logger {}

@RestController
@RequestMapping(ApiRoutes.Signatures.BASE)
class SignatureController(
    private val signatureService: SignatureService,
    private val signatureMapper: SignatureMapper,
    private val documentServiceProperties: com.docusing.signature.config.DocumentServiceProperties
) {

    @PostMapping(ApiRoutes.Signatures.CREATE)
    fun createSignatureRequest(
        @RequestHeader(ApiHeaders.USER_ID) userId: String,
        @RequestBody request: CreateSignatureRequestDto
    ): SignatureRequestResponse {
        logger.info { "Creating signature request for document ${request.documentId}" }
        val ownerId = UUID.fromString(userId)
        val entity = signatureService.createSignatureRequest(ownerId, request)
        return signatureMapper.toResponse(entity)
    }

    @GetMapping(ApiRoutes.Signatures.LIST)
    fun listSignatureRequests(
        @RequestHeader(ApiHeaders.USER_ID) userId: String
    ): List<SignatureRequestResponse> {
        logger.info { "Listing signature requests for owner $userId" }
        val ownerId = UUID.fromString(userId)
        val entities = signatureService.listSignatureRequestsByOwner(ownerId)
        return signatureMapper.toResponseList(entities)
    }

    @GetMapping(ApiRoutes.Signatures.BY_ID)
    fun getSignatureRequest(
        @PathVariable requestId: UUID
    ): SignatureRequestResponse {
        logger.info { "Getting signature request $requestId" }
        val entity = signatureService.getSignatureRequest(requestId)
        return signatureMapper.toResponse(entity)
    }

    @GetMapping(ApiRoutes.Signatures.BY_DOCUMENT)
    fun listSignatureRequestsByDocument(
        @PathVariable documentId: UUID
    ): List<SignatureRequestResponse> {
        logger.info { "Listing signature requests for document $documentId" }
        val entities = signatureService.listSignatureRequestsByDocument(documentId)
        return signatureMapper.toResponseList(entities)
    }

    @GetMapping(ApiRoutes.Signatures.Signer.MY_REQUESTS)
    fun listMySignerRequests(
        @RequestHeader(ApiHeaders.USER_EMAIL) userEmail: String
    ): List<SignatureRequestResponse> {
        logger.info { "Listing signature requests for signer $userEmail" }
        val entities = signatureService.listSignatureRequestsBySignerEmail(userEmail)
        return signatureMapper.toResponseList(entities)
    }

    @GetMapping(ApiRoutes.Signatures.Signer.INFO)
    fun getSignerInfo(
        @PathVariable signerId: UUID,
        @RequestParam(required = false) token: String?,
        @RequestHeader(ApiHeaders.USER_EMAIL, required = false) userEmail: String?
    ): SignerInfoResponse {
        logger.info { "Getting signer info for $signerId" }
        
        val authResult = signatureService.authorizeSignerInfo(signerId, token, userEmail)
        
        return when (authResult) {
            is SignerInfoAuthResult.Authorized -> {
                val signer = authResult.signer
                val request = signer.signatureRequest
                val documentUrl = "${documentServiceProperties.baseUrl}/api/documents/${request.documentId}/download"
                val isAuthenticated = authResult.authMethod == "AUTHENTICATED_USER"
                
                SignerInfoResponse(
                    signer = signatureMapper.toSignerResponse(signer),
                    signatureRequest = signatureMapper.toResponse(request),
                    documentUrl = documentUrl,
                    authenticated = isAuthenticated
                )
            }
            is SignerInfoAuthResult.TokenExpired -> {
                throw ResponseStatusException(HttpStatus.FORBIDDEN, "TOKEN_EXPIRED")
            }
            SignerInfoAuthResult.Forbidden -> {
                throw ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN")
            }
        }
    }

    @PostMapping(ApiRoutes.Signatures.Signer.SIGN)
    fun signDocument(
        @PathVariable signerId: UUID,
        @RequestBody request: SignDocumentRequest,
        @RequestHeader("X-Forwarded-For", required = false) forwardedFor: String?,
        @RequestHeader("User-Agent", required = false) userAgent: String?
    ): MessageResponse {
        val ipAddress = forwardedFor?.split(",")?.firstOrNull()?.trim() ?: "unknown"
        logger.info { "Signing document for signer $signerId" }
        signatureService.signDocument(signerId, request.otp ?: "", ipAddress, userAgent ?: "unknown")
        return MessageResponse(ResponseMessages.Success.DOCUMENT_SIGNED)
    }

    @PostMapping(ApiRoutes.Signatures.Signer.REJECT)
    fun rejectDocument(
        @PathVariable signerId: UUID,
        @RequestBody request: Map<String, String>
    ): MessageResponse {
        val reason = request["reason"]
        logger.info { "Rejecting document for signer $signerId" }
        signatureService.rejectSignature(signerId, reason)
        return MessageResponse(ResponseMessages.Success.DOCUMENT_REJECTED)
    }

    @GetMapping(ApiRoutes.Signatures.DOWNLOAD_SIGNED)
    fun downloadSignedDocument(
        @PathVariable requestId: UUID,
        @RequestHeader(ApiHeaders.USER_ID) userId: String,
        @RequestHeader(ApiHeaders.USER_EMAIL, required = false) userEmail: String?
    ): ResponseEntity<InputStreamResource> {
        logger.info { "Downloading signed document for request $requestId" }
        val downloadData = signatureService.buildSignedPdfDownload(requestId, userId, userEmail)
        
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"${downloadData.filename}\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(InputStreamResource(downloadData.pdfBytes.inputStream()))
    }

    @PostMapping(ApiRoutes.Signatures.REGENERATE_MAGIC_LINK)
    fun regenerateMagicLink(
        @PathVariable requestId: UUID,
        @PathVariable signerId: UUID,
        @RequestHeader(ApiHeaders.USER_ID) userId: String
    ): MagicLinkRegeneratedResponse {
        logger.info { "Regenerating magic link for signer $signerId" }
        val ownerId = UUID.fromString(userId)
        val magicLink = signatureService.regenerateMagicLink(requestId, signerId, ownerId, null)
        return MagicLinkRegeneratedResponse(
            message = ResponseMessages.Success.MAGIC_LINK_REGENERATED,
            magicLink = magicLink,
            expirationDays = 7
        )
    }

    @GetMapping(ApiRoutes.Signatures.Versions.LIST)
    fun listPdfVersions(
        @PathVariable requestId: UUID,
        @RequestHeader(ApiHeaders.USER_ID) userId: String,
        @RequestHeader(ApiHeaders.USER_EMAIL, required = false) userEmail: String?
    ): List<PdfVersionResponse> {
        logger.info { "Listing PDF versions for request $requestId" }
        return signatureService.listPdfVersionResponses(requestId, userId, userEmail)
    }

    @GetMapping(ApiRoutes.Signatures.Versions.DOWNLOAD)
    fun downloadPdfVersion(
        @PathVariable requestId: UUID,
        @PathVariable versionNumber: Int,
        @RequestHeader(ApiHeaders.USER_ID) userId: String,
        @RequestHeader(ApiHeaders.USER_EMAIL, required = false) userEmail: String?
    ): ResponseEntity<InputStreamResource> {
        logger.info { "Downloading PDF version v$versionNumber for request $requestId" }
        val downloadData = signatureService.buildPdfVersionDownload(requestId, versionNumber, userId, userEmail)

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"${downloadData.filename}\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(InputStreamResource(downloadData.pdfBytes.inputStream()))
    }

    @PostMapping(ApiRoutes.Signatures.Signer.UPLOAD_SIGNATURE)
    fun uploadSignatureImage(
        @PathVariable signerId: UUID,
        @RequestBody request: Map<String, String>
    ): SignatureUploadResponse {
        val signatureDataUrl = request["signatureDataUrl"] ?: throw IllegalArgumentException("signatureDataUrl is required")
        logger.info { "Uploading signature image for signer $signerId" }
        val imagePath = signatureService.uploadSignature(signerId, signatureDataUrl)
        return SignatureUploadResponse(
            message = ResponseMessages.Success.SIGNATURE_UPLOADED,
            signatureImagePath = imagePath
        )
    }
    
    @PostMapping(ApiRoutes.Signatures.Signer.SAVE_USER_SIGNATURE)
    fun saveSignerUserSignature(
        @PathVariable signerId: UUID,
        @RequestParam(required = false) token: String?,
        @RequestHeader(ApiHeaders.USER_EMAIL, required = false) userEmail: String?,
        @RequestBody request: Map<String, String>
    ): UserSignatureResponse {
        logger.info { "Saving user signature for signer $signerId" }
        
        val signatureDataUrl = request["signatureDataUrl"] ?: throw IllegalArgumentException("signatureDataUrl is required")
        val name = request["name"]
        val setAsDefault = request["setAsDefault"]?.toBoolean() ?: false
        
        // Autorizar acceso del firmante
        val authResult = signatureService.authorizeSignerInfo(signerId, token, userEmail)
        
        when (authResult) {
            is SignerInfoAuthResult.Authorized -> {
                val signer = authResult.signer
                
                // Guardar firma registrada usando el email del firmante
                // Esto funciona tanto para usuarios autenticados como para invitados
                val saved = signatureService.saveUserSignatureByEmail(
                    email = signer.email,
                    signatureDataUrl = signatureDataUrl,
                    name = name,
                    setAsDefault = setAsDefault
                )
                
                logger.info { "User signature saved for signer ${signer.email}" }
                
                return UserSignatureResponse(
                    id = saved.id!!,
                    userId = saved.userId,
                    signatureImagePath = saved.signatureImagePath,
                    name = saved.name,
                    isDefault = saved.isDefault,
                    createdAt = saved.createdAt!!
                )
            }
            is SignerInfoAuthResult.TokenExpired -> {
                throw ResponseStatusException(HttpStatus.FORBIDDEN, "TOKEN_EXPIRED")
            }
            SignerInfoAuthResult.Forbidden -> {
                throw ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN")
            }
        }
    }
    
    @GetMapping(ApiRoutes.Signatures.Signer.USER_SIGNATURES)
    fun getSignerUserSignatures(
        @PathVariable signerId: UUID,
        @RequestParam(required = false) token: String?,
        @RequestHeader(ApiHeaders.USER_EMAIL, required = false) userEmail: String?
    ): List<UserSignatureResponse> {
        logger.info { "Getting user signatures for signer $signerId" }
        
        // Autorizar acceso del firmante
        val authResult = signatureService.authorizeSignerInfo(signerId, token, userEmail)
        
        when (authResult) {
            is SignerInfoAuthResult.Authorized -> {
                val signer = authResult.signer
                
                // Obtener firmas registradas del firmante usando su email
                // Esto funciona tanto para usuarios autenticados como para invitados
                // ya que se genera un userId determinístico basado en el email
                val signatures = signatureService.getUserSignaturesByEmail(signer.email)
                
                logger.info { "Found ${signatures.size} registered signatures for signer ${signer.email}" }
                
                return signatures.map {
                    UserSignatureResponse(
                        id = it.id!!,
                        userId = it.userId,
                        signatureImagePath = it.signatureImagePath,
                        name = it.name,
                        isDefault = it.isDefault,
                        createdAt = it.createdAt!!
                    )
                }
            }
            is SignerInfoAuthResult.TokenExpired -> {
                throw ResponseStatusException(HttpStatus.FORBIDDEN, "TOKEN_EXPIRED")
            }
            SignerInfoAuthResult.Forbidden -> {
                throw ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN")
            }
        }
    }

    @PostMapping(ApiRoutes.Signatures.Signer.REQUEST_OTP)
    fun requestOtp(
        @PathVariable signerId: UUID
    ): MessageResponse {
        logger.info { "OTP requested for signer $signerId (OTP feature disabled - direct signing)" }
        return MessageResponse("OTP feature disabled - use direct signing")
    }

    @PostMapping(ApiRoutes.Signatures.DETECT_FIELDS)
    fun detectFields(
        @PathVariable documentId: UUID,
        @RequestHeader(ApiHeaders.USER_ID) userId: String
    ): List<SignatureFieldSuggestionResponse> {
        logger.info { "Detecting signature fields in document $documentId (feature not implemented)" }
        return emptyList()
    }
}
