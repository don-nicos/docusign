package com.docusing.auth.common.dto.request

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank

data class MagicLinkRequest(
    @field:Email
    @field:NotBlank
    val email: String,

    val redirectPath: String? = null
)
