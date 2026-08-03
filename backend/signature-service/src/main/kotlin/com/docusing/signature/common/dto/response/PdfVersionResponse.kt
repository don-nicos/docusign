package com.docusing.signature.common.dto.response

import java.time.Instant
import java.util.UUID

data class PdfVersionResponse(
    val id: UUID,
    val versionNumber: Int,
    val documentHash: String,
    val signedBy: String?,
    val signerId: UUID?,
    val signaturesCount: Int,
    val totalSigners: Int,
    val isFinal: Boolean,
    val hasCertificate: Boolean,
    val fileSizeBytes: Long,
    val createdAt: Instant,
    val description: String // "Original", "Firmado por Juan Pérez", etc.
)
