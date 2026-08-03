package com.docusing.signature.common.dto.request

data class RegenerateMagicLinkRequestBody(
    val expirationDays: Int? = null
)
