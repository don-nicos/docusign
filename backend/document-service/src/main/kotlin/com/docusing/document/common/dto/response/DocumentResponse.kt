package com.docusing.document.common.dto.response

import com.docusing.document.domain.model.DocumentStatus
import java.time.Instant

data class DocumentResponse(
    val id: String,
    val ownerId: String,
    val title: String,
    val status: DocumentStatus,
    val originalFilename: String,
    val storageKey: String,
    val fileSize: Long,
    val contentType: String?,
    val hashSha256: String,
    val createdAt: Instant?,
    val updatedAt: Instant?
)
