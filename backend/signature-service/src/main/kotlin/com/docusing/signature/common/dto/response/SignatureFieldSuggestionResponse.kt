package com.docusing.signature.common.dto.response

data class SignatureFieldSuggestionResponse(
    val page: Int,
    val x: Double,
    val y: Double,
    val width: Double,
    val height: Double,
    val confidence: Double
)
