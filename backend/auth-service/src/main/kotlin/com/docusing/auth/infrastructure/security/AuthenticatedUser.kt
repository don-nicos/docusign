package com.docusing.auth.infrastructure.security

import java.util.UUID

data class AuthenticatedUser(
    val userId: UUID,
    val email: String
)
