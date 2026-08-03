package com.docusing.auth.common.dto.request

data class UpdateProfileRequest(
    val fullName: String?,
    val rut: String?,
    val firstName: String?,
    val lastName: String?,
    val secondLastName: String?,
    val phone: String?
)
