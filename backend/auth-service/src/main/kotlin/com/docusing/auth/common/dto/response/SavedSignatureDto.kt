package com.docusing.auth.common.dto.response

import java.time.Instant

data class SavedSignatureResponse(
    val id: String,
    val name: String,
    val signatureData: String,
    val isDefault: Boolean,
    val createdAt: Instant?
)
