package com.docusing.auth.common.dto.response

import java.time.Instant

data class MagicLinkResponse(
    val email: String,
    val expiresAt: Instant,
    val redirectPath: String?
)
