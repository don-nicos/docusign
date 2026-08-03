package com.docusing.auth.common.dto.request

import jakarta.validation.constraints.NotBlank

data class ExchangeMagicLinkRequest(
    @field:NotBlank
    val token: String
)
