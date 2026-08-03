package com.docusing.signature.apis.client

import org.springframework.cloud.openfeign.FeignClient
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import java.util.UUID
import com.docusing.signature.common.web.ApiHeaders
import com.docusing.signature.common.web.ExternalRoutes

@FeignClient(
    name = "document-service",
    url = "\${document.service.base-url}"
)
interface DocumentFeignClient {

    @PostMapping(ExternalRoutes.Documents.LOCK)
    fun lockDocument(
        @PathVariable documentId: UUID,
        @RequestHeader(ApiHeaders.USER_ID) userId: String
    ): ResponseEntity<Void>

    @GetMapping(ExternalRoutes.Documents.GET)
    fun getDocument(
        @PathVariable documentId: UUID,
        @RequestHeader(ApiHeaders.USER_ID) userId: String
    ): ResponseEntity<Void>

    @GetMapping(ExternalRoutes.Documents.DOWNLOAD)
    fun downloadPdf(
        @PathVariable documentId: UUID
    ): ResponseEntity<ByteArray>

    @GetMapping(ExternalRoutes.Documents.COUNT)
    fun countDocuments(
        @RequestHeader(ApiHeaders.USER_ID) userId: String
    ): DocumentCountResponse

    @PutMapping(ExternalRoutes.Documents.UPLOAD_PDF, consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    fun uploadPdf(
        @PathVariable documentId: UUID,
        @RequestPart("file") file: MultipartFile
    ): ResponseEntity<Void>
}

data class DocumentCountResponse(
    val count: Long
)
