package com.docusing.signature.common.dto.request

import jakarta.validation.constraints.NotBlank

data class UploadSignatureRequest(
    @field:NotBlank(message = "signatureDataUrl es requerido")
    val signatureDataUrl: String,
    
    val method: String? = null // 'draw' o 'type'
)
