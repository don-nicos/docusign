package com.docusing.auth.common.dto.response

data class AuthSessionResponse(
    val user: UserResponse,
    val tokens: AuthTokensResponse,
    val redirectPath: String?
)
