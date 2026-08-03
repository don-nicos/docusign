package com.docusing.document.infrastructure.storage

import java.io.InputStream
import java.util.UUID
import org.springframework.core.io.Resource

interface DocumentStorage {
    fun save(
        ownerId: UUID,
        filename: String,
        contentType: String?,
        inputStream: InputStream,
        organizationId: UUID? = null,
        subCompanyId: UUID? = null
    ): DocumentStorageResult

    fun load(storageKey: String): DocumentStorageResource

    fun delete(storageKey: String)
}

data class DocumentStorageResult(
    val storageKey: String,
    val size: Long,
    val contentType: String?,
    val hashSha256: String
)

data class DocumentStorageResource(
    val resource: Resource,
    val filename: String,
    val contentType: String?,
    val size: Long
)
