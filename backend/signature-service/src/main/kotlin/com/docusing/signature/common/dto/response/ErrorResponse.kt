package com.docusing.signature.common.dto.response

data class ErrorResponse(
    val error: String,
    val code: String? = null,
    val details: Map<String, Any?>? = null
)
