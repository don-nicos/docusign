package com.docusing.signature.common.dto.response

data class RutValidationResponse(
    val valid: Boolean,
    val formatted: String? = null,
    val message: String
)
