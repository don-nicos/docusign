package com.docusing.signature.common.dto.response

import java.time.Instant
import java.util.UUID

data class UserSignatureResponse(
    val id: UUID,
    val userId: UUID,
    val signatureImagePath: String,
    val name: String?,
    val isDefault: Boolean,
    val createdAt: Instant
)
