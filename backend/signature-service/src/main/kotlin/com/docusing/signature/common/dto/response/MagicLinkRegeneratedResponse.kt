package com.docusing.signature.common.dto.response

data class MagicLinkRegeneratedResponse(
    val message: String,
    val magicLink: String,
    val expirationDays: Int
)
