package com.docusing.auth.config.security

import java.security.Principal
import java.util.UUID

data class AuthenticatedUser(
    val id: UUID,
    val email: String?,
    val fullName: String?
) : Principal {
    override fun getName(): String = email ?: id.toString()
}
