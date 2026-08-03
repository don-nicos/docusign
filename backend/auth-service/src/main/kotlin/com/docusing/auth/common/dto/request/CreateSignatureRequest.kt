package com.docusing.auth.common.dto.request

data class CreateSignatureRequest(
    val name: String,
    val signatureData: String,
    val isDefault: Boolean = false
)
