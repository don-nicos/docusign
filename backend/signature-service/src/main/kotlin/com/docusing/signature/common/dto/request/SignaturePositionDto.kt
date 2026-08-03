package com.docusing.signature.common.dto.request

data class SignaturePositionDto(
    val pageNumber: Int,
    val positionX: Double,
    val positionY: Double,
    val width: Double = 200.0,
    val height: Double = 80.0,
    val label: String? = null
)
