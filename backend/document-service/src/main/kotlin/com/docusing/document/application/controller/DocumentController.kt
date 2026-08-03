package com.docusing.document.application.controller

import com.docusing.document.common.dto.response.DocumentCountResponse
import com.docusing.document.common.dto.response.DocumentResponse
import com.docusing.document.common.dto.response.MessageResponse
import com.docusing.document.common.dto.request.UpdateTitleRequest
import com.docusing.document.core.service.DocumentService
import com.docusing.document.common.mapper.DocumentMapper
import com.docusing.document.common.web.ApiRoutes
import com.docusing.document.common.web.ApiHeaders
import jakarta.validation.Valid
import java.util.UUID
import mu.KotlinLogging
import org.springframework.core.io.Resource
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile

private val logger = KotlinLogging.logger {}

@RestController
@RequestMapping(ApiRoutes.Documents.BASE)
class DocumentController(
    private val documentService: DocumentService,
    private val documentMapper: DocumentMapper
) {

    @PostMapping(consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    @ResponseStatus(HttpStatus.CREATED)
    fun uploadDocument(
        @RequestHeader(ApiHeaders.USER_ID) userId: String,
        @RequestParam("file") file: MultipartFile,
        @RequestParam("title", required = false) title: String?,
        @RequestParam("organizationId", required = false) organizationId: String?
    ): DocumentResponse {
        val ownerId = UUID.fromString(userId)
        val orgId = organizationId?.let { UUID.fromString(it) }
        val entity = documentService.uploadDocument(
            ownerId = ownerId,
            title = title,
            originalFilename = file.originalFilename ?: "document.pdf",
            contentType = file.contentType,
            inputStream = file.inputStream,
            organizationId = orgId
        )
        return documentMapper.toResponse(entity)
    }

    @GetMapping
    fun listDocuments(
        @RequestHeader(ApiHeaders.USER_ID) userId: String,
        @RequestParam("organizationId", required = false) organizationId: String?
    ): List<DocumentResponse> {
        val ownerId = UUID.fromString(userId)
        val documents = if (organizationId != null) {
            documentService.listOrganizationDocuments(UUID.fromString(organizationId))
        } else {
            documentService.listDocuments(ownerId)
        }
        return documentMapper.toResponseList(documents)
    }

    @GetMapping(ApiRoutes.Documents.COUNT)
    fun countDocuments(
        @RequestHeader(ApiHeaders.USER_ID) userId: String
    ): DocumentCountResponse {
        val ownerId = UUID.fromString(userId)
        val count = documentService.countDocuments(ownerId)
        return DocumentCountResponse(count)
    }

    @GetMapping("/dev/all")
    fun listAllDocuments(): List<DocumentResponse> {
        logger.warn { "⚠️ Development endpoint: listing ALL documents without user filter" }
        val documents = documentService.listAllDocuments()
        return documentMapper.toResponseList(documents)
    }

    @GetMapping(ApiRoutes.Documents.BY_ID)
    fun getDocument(
        @RequestHeader(ApiHeaders.USER_ID) userId: String,
        @PathVariable documentId: UUID
    ): DocumentResponse {
        val ownerId = UUID.fromString(userId)
        val entity = documentService.getDocument(ownerId, documentId)
        return documentMapper.toResponse(entity)
    }

    private fun sanitizeFilename(filename: String): String {
        return java.text.Normalizer.normalize(filename, java.text.Normalizer.Form.NFD)
            .replace("\\p{M}".toRegex(), "")
            .replace("[^\\x00-\\x7F]".toRegex(), "")
    }

    @GetMapping(ApiRoutes.Documents.DOWNLOAD)
    fun downloadDocument(
        @RequestHeader(ApiHeaders.USER_ID, required = false) userId: String?,
        @PathVariable documentId: UUID
    ): ResponseEntity<Resource> {
        val ownerId = userId?.let { UUID.fromString(it) }
        val (entity, storageResource) = documentService.downloadDocument(ownerId, documentId)
        val sanitizedFilename = sanitizeFilename(entity.originalFilename)
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"$sanitizedFilename\"")
            .contentType(MediaType.parseMediaType(entity.contentType ?: MediaType.APPLICATION_OCTET_STREAM_VALUE))
            .contentLength(storageResource.size)
            .body(storageResource.resource)
    }

    @GetMapping("/{documentId}/view")
    fun viewDocument(
        @RequestHeader(ApiHeaders.USER_ID, required = false) userId: String?,
        @PathVariable documentId: UUID
    ): ResponseEntity<Resource> {
        val ownerId = userId?.let { UUID.fromString(it) }
        val (entity, storageResource) = documentService.downloadDocument(ownerId, documentId)
        val sanitizedFilename = sanitizeFilename(entity.originalFilename)
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"$sanitizedFilename\"")
            .contentType(MediaType.parseMediaType(entity.contentType ?: MediaType.APPLICATION_PDF_VALUE))
            .contentLength(storageResource.size)
            .header(HttpHeaders.CACHE_CONTROL, "no-cache")
            .header(HttpHeaders.PRAGMA, "no-cache")
            .header(HttpHeaders.EXPIRES, "0")
            .body(storageResource.resource)
    }

    @PutMapping(ApiRoutes.Documents.UPDATE_TITLE)
    fun updateTitle(
        @RequestHeader(ApiHeaders.USER_ID) userId: String,
        @PathVariable documentId: UUID,
        @Valid @RequestBody request: UpdateTitleRequest
    ): DocumentResponse {
        val ownerId = UUID.fromString(userId)
        val entity = documentService.updateTitle(ownerId, documentId, request.title)
        return documentMapper.toResponse(entity)
    }

    @PutMapping(ApiRoutes.Documents.UPDATE_FILE)
    fun updateDocumentFile(
        @RequestHeader(ApiHeaders.USER_ID, required = false) userId: String?,
        @PathVariable documentId: UUID,
        @RequestParam("file") file: MultipartFile
    ): DocumentResponse {
        logger.info { "Updating document file $documentId (${file.size} bytes)" }
        val ownerId = userId?.let { UUID.fromString(it) }
        val entity = documentService.updateDocumentFile(
            ownerId = ownerId,
            documentId = documentId,
            contentType = file.contentType,
            inputStream = file.inputStream
        )
        logger.info { "Document file $documentId updated successfully" }
        return documentMapper.toResponse(entity)
    }

    @PostMapping(ApiRoutes.Documents.LOCK)
    fun lockDocument(
        @RequestHeader(ApiHeaders.USER_ID) userId: String,
        @PathVariable documentId: UUID
    ): DocumentResponse {
        val ownerId = UUID.fromString(userId)
        val entity = documentService.lockDocument(ownerId, documentId)
        return documentMapper.toResponse(entity)
    }

    @DeleteMapping(ApiRoutes.Documents.BY_ID)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteDocument(
        @RequestHeader(ApiHeaders.USER_ID) userId: String,
        @PathVariable documentId: UUID
    ) {
        val ownerId = UUID.fromString(userId)
        documentService.deleteDocument(ownerId, documentId)
    }
}
