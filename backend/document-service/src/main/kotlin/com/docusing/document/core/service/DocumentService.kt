package com.docusing.document.core.service

import com.docusing.document.domain.model.DocumentEntity
import com.docusing.document.domain.model.DocumentStatus
import com.docusing.document.domain.repository.DocumentRepository
import com.docusing.document.core.exception.*
import com.docusing.document.apis.client.AuthFeignClient
import com.docusing.document.infrastructure.storage.DocumentStorage
import com.docusing.document.infrastructure.storage.DocumentStorageResource
import java.io.InputStream
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import mu.KotlinLogging
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.client.RestClient
import org.springframework.web.server.ResponseStatusException

private val logger = KotlinLogging.logger {}

@Service
class DocumentService(
    private val documentRepository: DocumentRepository,
    private val documentStorage: DocumentStorage,
    private val clock: Clock,
    private val authFeignClient: AuthFeignClient,
    @Value("\${payment.service.base-url:http://localhost:8085}") private val paymentServiceBaseUrl: String,
    @Value("\${app.free-tier.max-documents:3}") private val freeTierMaxDocuments: Long
) {

    private val paymentRestClient: RestClient = RestClient.builder()
        .baseUrl(paymentServiceBaseUrl)
        .build()

    private data class SubscriptionCacheKey(val ownerId: UUID, val organizationId: UUID?)
    private data class CachedSubscription(val active: Boolean, val cachedAt: Instant)

    private val subscriptionStatusCache = ConcurrentHashMap<SubscriptionCacheKey, CachedSubscription>()
    private val cacheTtl: Duration = Duration.ofMinutes(5)

    private fun hasActiveSubscription(ownerId: UUID, organizationId: UUID?): Boolean {
        val cacheKey = SubscriptionCacheKey(ownerId, organizationId)
        val now = Instant.now(clock)

        val response = runCatching {
            paymentRestClient
                .get()
                .uri { builder ->
                    val uriBuilder = builder
                        .path("/api/payments/subscriptions/{userId}/status")

                    if (organizationId != null) {
                        uriBuilder.queryParam("organizationId", organizationId)
                    }

                    uriBuilder.build(ownerId)
                }
                .retrieve()
                .body(SubscriptionAccessStatusResponse::class.java)
        }.onSuccess { body ->
            if (body != null) {
                subscriptionStatusCache[cacheKey] = CachedSubscription(body.active, now)
            }
        }.getOrElse { throwable ->
            val cached = subscriptionStatusCache[cacheKey]
            if (cached != null && Duration.between(cached.cachedAt, now) <= cacheTtl) {
                return cached.active
            }
            throw ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "No se pudo validar el estado de la suscripción",
                throwable
            )
        }

        return response?.active == true
    }

    @Transactional(readOnly = true)
    fun countDocuments(ownerId: UUID): Long = documentRepository.countByOwnerId(ownerId)

    @Transactional
    fun uploadDocument(
        ownerId: UUID,
        title: String?,
        originalFilename: String,
        contentType: String?,
        inputStream: InputStream,
        organizationId: UUID? = null
    ): DocumentEntity {
        val currentCount = documentRepository.countByOwnerId(ownerId)
        if (currentCount >= freeTierMaxDocuments && !hasActiveSubscription(ownerId, organizationId)) {
            throw ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Necesitas una suscripción activa para cargar más de $freeTierMaxDocuments documentos"
            )
        }

        val sanitizedTitle = title?.takeIf { it.isNotBlank() } ?: originalFilename
        val storageResult = runCatching {
            documentStorage.save(ownerId, originalFilename, contentType, inputStream, organizationId, null)
        }.getOrElse { throwable ->
            throw DocumentStorageException("No fue posible almacenar el documento", throwable)
        }

        // Capturar trace ID del contexto
        val traceId = com.docusing.document.infrastructure.tracing.TraceIdInterceptor.getCurrentTraceId()

        val entity = DocumentEntity(
            ownerId = ownerId,
            title = sanitizedTitle,
            status = DocumentStatus.DRAFT,
            originalFilename = originalFilename,
            storageKey = storageResult.storageKey,
            fileSize = storageResult.size,
            contentType = storageResult.contentType,
            hashSha256 = storageResult.hashSha256,
            traceId = traceId,
            organizationId = organizationId,
            isOrganizationDocument = organizationId != null
        )
        val saved = documentRepository.save(entity)
        logger.info { "Documento ${saved.id} cargado por $ownerId con trace ID: $traceId" }
        return saved
    }

    @Transactional(readOnly = true)
    fun listDocuments(ownerId: UUID): List<DocumentEntity> {
        val ownedDocuments = documentRepository.findAllByOwnerId(ownerId)
        return ownedDocuments
    }
    
    @Transactional(readOnly = true)
    fun listOrganizationDocuments(organizationId: UUID): List<DocumentEntity> {
        return documentRepository.findAllByOrganizationId(organizationId)
    }

    @Transactional(readOnly = true)
    fun listAllDocuments(): List<DocumentEntity> {
        logger.warn { "⚠️ Listando TODOS los documentos sin filtro de usuario (solo desarrollo)" }
        return documentRepository.findAll()
    }

    @Transactional(readOnly = true)
    fun getDocument(ownerId: UUID, documentId: UUID): DocumentEntity {
        val entity = documentRepository.findById(documentId)
            .orElseThrow { DocumentNotFoundException(documentId) }
        
        if (!canAccessDocument(ownerId, entity)) {
            throw DocumentNotFoundException(documentId)
        }
        return entity
    }

    private fun canAccessDocument(userId: UUID, document: DocumentEntity): Boolean {
        if (document.ownerId == userId) return true
        
        if (document.organizationId != null) {
            return try {
                val roleResponse = authFeignClient.getMyRole(document.organizationId!!, userId.toString())
                roleResponse["role"] != null
            } catch (e: Exception) {
                logger.warn(e) { "Error verificando membresía organizacional para usuario $userId en documento ${document.id}" }
                false
            }
        }
        
        return false
    }

    @Transactional(readOnly = true)
    fun getDocumentOrThrow(documentId: UUID): DocumentEntity = documentRepository.findById(documentId)
        .orElseThrow { DocumentNotFoundException(documentId) }

    @Transactional(readOnly = true)
    fun downloadDocument(ownerId: UUID?, documentId: UUID): Pair<DocumentEntity, DocumentStorageResource> {
        val entity = if (ownerId != null) {
            getDocument(ownerId, documentId)
        } else {
            documentRepository.findById(documentId)
                .orElseThrow { DocumentNotFoundException(documentId) }
        }
        val resource = runCatching {
            documentStorage.load(entity.storageKey)
        }.getOrElse { throwable ->
            throw DocumentStorageException("No fue posible recuperar el archivo", throwable)
        }
        return entity to resource
    }

    @Transactional
    fun updateTitle(ownerId: UUID, documentId: UUID, newTitle: String): DocumentEntity {
        val entity = getDocument(ownerId, documentId)
        entity.title = newTitle
        return documentRepository.save(entity)
    }

    @Transactional
    fun updateDocumentFile(
        ownerId: UUID?,
        documentId: UUID,
        contentType: String?,
        inputStream: InputStream
    ): DocumentEntity {
        val entity = if (ownerId != null) {
            getDocument(ownerId, documentId)
        } else {
            documentRepository.findById(documentId)
                .orElseThrow { DocumentNotFoundException(documentId) }
        }
        
        // Eliminar archivo anterior del storage
        runCatching {
            documentStorage.delete(entity.storageKey)
        }.onFailure { throwable ->
            logger.warn { "No se pudo eliminar archivo anterior ${entity.storageKey}: ${throwable.message}" }
        }
        
        // Guardar nuevo archivo
        val storageResult = runCatching {
            documentStorage.save(entity.ownerId, entity.originalFilename, contentType, inputStream, entity.organizationId, null)
        }.getOrElse { throwable ->
            throw DocumentStorageException("No fue posible almacenar el documento actualizado", throwable)
        }
        
        // Actualizar metadatos
        entity.storageKey = storageResult.storageKey
        entity.fileSize = storageResult.size
        entity.contentType = storageResult.contentType
        entity.hashSha256 = storageResult.hashSha256
        entity.updatedAt = Instant.now(clock)
        
        val saved = documentRepository.save(entity)
        logger.info { "Archivo del documento ${saved.id} actualizado exitosamente" }
        return saved
    }

    @Transactional
    fun lockDocument(ownerId: UUID, documentId: UUID): DocumentEntity {
        val entity = getDocument(ownerId, documentId)
        if (entity.status == DocumentStatus.LOCKED) {
            return entity
        }
        entity.status = DocumentStatus.LOCKED
        return documentRepository.save(entity)
    }

    @Transactional
    fun archiveDocument(documentId: UUID): DocumentEntity {
        val entity = getDocumentOrThrow(documentId)
        entity.status = DocumentStatus.ARCHIVED
        return documentRepository.save(entity)
    }

    @Transactional
    fun deleteDocument(ownerId: UUID, documentId: UUID) {
        val entity = getDocument(ownerId, documentId)
        if (entity.status != DocumentStatus.DRAFT) {
            throw DocumentLockedException(documentId)
        }
        documentRepository.delete(entity)
        runCatching { documentStorage.delete(entity.storageKey) }
            .onFailure { throwable -> logger.warn(throwable) { "Error eliminando archivo ${entity.storageKey}" } }
    }

    @Transactional(readOnly = true)
    fun validateOwnerAccess(ownerId: UUID, documentId: UUID) {
        getDocument(ownerId, documentId)
    }

    fun generateDownloadTokenPlaceholder(documentId: UUID): String {
        // Placeholder para integración futura (presigned URLs, etc.)
        val now = Instant.now(clock)
        return "$documentId-$now"
    }
}

private data class SubscriptionAccessStatusResponse(
    val active: Boolean,
    val currentPeriodEnd: String?
)
