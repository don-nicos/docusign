package com.docusing.signature.common.dto.response

data class SignaturePositionResponse(
    val pageNumber: Int,
    val positionX: Double,
    val positionY: Double,
    val width: Double,
    val height: Double,
    val label: String? = null
)
