package com.docusing.signature.common.dto.request

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank

data class SignerInputDto(
    @field:NotBlank
    @field:Email
    val email: String,
    
    @field:NotBlank
    val fullName: String,
    
    @field:Min(0)
    val orderIndex: Int,
    
    val rut: String? = null,
    
    val signaturePage: Int? = null,
    val signaturePositionX: Double? = null,
    val signaturePositionY: Double? = null,
    val signatureWidth: Double? = null,
    val signatureHeight: Double? = null,
    
    val positions: List<SignaturePositionDto>? = null
)
