package com.docusing.auth.core.service

import com.docusing.auth.common.dto.request.UpdateProfileRequest
import com.docusing.auth.common.dto.response.UserResponse
import com.docusing.auth.domain.model.UserEntity
import com.docusing.auth.domain.repository.UserRepository
import jakarta.persistence.EntityNotFoundException
import mu.KotlinLogging
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

private val logger = KotlinLogging.logger {}

@Service
class UserProfileService(
    private val userRepository: UserRepository
) {
    @Transactional(readOnly = true)
    fun getUserProfile(userId: UUID): UserResponse {
        val user = userRepository.findById(userId)
            .orElseThrow { EntityNotFoundException("Usuario no encontrado") }
        return user.toResponse()
    }

    @Transactional
    fun updateProfile(userId: UUID, request: UpdateProfileRequest): UserResponse {
        val user = userRepository.findById(userId)
            .orElseThrow { EntityNotFoundException("Usuario no encontrado") }

        val updated = UserEntity(
            id = user.id,
            email = user.email,
            fullName = request.fullName ?: user.fullName,
            passwordHash = user.passwordHash,
            rut = request.rut ?: user.rut,
            firstName = request.firstName ?: user.firstName,
            lastName = request.lastName ?: user.lastName,
            secondLastName = request.secondLastName ?: user.secondLastName,
            phone = request.phone ?: user.phone,
            address = user.address,
            birthDate = user.birthDate,
            status = user.status,
            createdAt = user.createdAt,
            updatedAt = user.updatedAt
        )

        val saved = userRepository.save(updated)
        logger.info { "Perfil actualizado para usuario: $userId" }
        return saved.toResponse()
    }

    @Transactional(readOnly = true)
    fun getUserByEmail(email: String): UserResponse? {
        return userRepository.findByEmail(email).orElse(null)?.toResponse()
    }

    private fun UserEntity.toResponse() = UserResponse(
        id = id.toString(),
        email = email,
        fullName = fullName,
        rut = rut,
        firstName = firstName,
        lastName = lastName,
        secondLastName = secondLastName,
        phone = phone,
        createdAt = createdAt
    )
}
