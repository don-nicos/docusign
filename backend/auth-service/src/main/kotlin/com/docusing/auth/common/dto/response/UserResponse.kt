package com.docusing.auth.common.dto.response

import java.time.Instant

data class UserResponse(
    val id: String,
    val email: String,
    val fullName: String,
    val rut: String? = null,
    val firstName: String? = null,
    val lastName: String? = null,
    val secondLastName: String? = null,
    val phone: String? = null,
    val createdAt: Instant? = null
)
