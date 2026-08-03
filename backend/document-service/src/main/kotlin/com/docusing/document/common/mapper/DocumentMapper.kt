package com.docusing.document.common.mapper

import com.docusing.document.common.dto.response.DocumentResponse
import com.docusing.document.domain.model.DocumentEntity
import org.springframework.stereotype.Component

@Component
class DocumentMapper {
    fun toResponse(entity: DocumentEntity): DocumentResponse = DocumentResponse(
        id = entity.id?.toString() ?: "",
        ownerId = entity.ownerId.toString(),
        title = entity.title,
        status = entity.status,
        originalFilename = entity.originalFilename,
        storageKey = entity.storageKey,
        fileSize = entity.fileSize,
        contentType = entity.contentType,
        hashSha256 = entity.hashSha256,
        createdAt = entity.createdAt,
        updatedAt = entity.updatedAt
    )

    fun toResponseList(entities: List<DocumentEntity>): List<DocumentResponse> = entities.map(::toResponse)
}
