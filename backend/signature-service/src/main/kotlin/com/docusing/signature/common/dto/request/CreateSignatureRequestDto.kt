package com.docusing.signature.common.dto.request

import jakarta.validation.Valid
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty

data class CreateSignatureRequestDto(
    @field:NotBlank
    val documentId: String,

    @field:NotBlank
    val title: String,

    @field:NotEmpty
    @field:Valid
    val signers: List<SignerInputDto>,

    val expirationHours: Long? = 72,
    val pdfViewerWidth: Int? = null,
    
    @field:Min(1)
    val magicLinkExpirationDays: Int? = 7
)
