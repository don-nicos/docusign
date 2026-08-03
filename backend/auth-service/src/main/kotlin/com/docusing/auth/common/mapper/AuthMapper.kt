package com.docusing.auth.common.mapper

import com.docusing.auth.common.dto.response.UserResponse
import com.docusing.auth.domain.model.UserEntity
import org.springframework.stereotype.Component

@Component
class AuthMapper {
    fun toUserResponse(user: UserEntity): UserResponse = UserResponse(
        id = user.id?.toString() ?: "",
        email = user.email,
        fullName = user.fullName,
        rut = user.rut,
        firstName = user.firstName,
        lastName = user.lastName,
        secondLastName = user.secondLastName,
        phone = user.phone,
        createdAt = user.createdAt
    )
}
