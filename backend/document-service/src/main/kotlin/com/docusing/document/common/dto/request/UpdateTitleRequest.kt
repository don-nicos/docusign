package com.docusing.document.common.dto.request

import jakarta.validation.constraints.NotBlank

data class UpdateTitleRequest(
    @field:NotBlank
    val title: String
)
