package com.docusing.auth.common.dto.response

data class AuthTokensResponse(
    val accessToken: String,
    val refreshToken: String,
    val expiresInSeconds: Long,
    val refreshExpiresInSeconds: Long
)
