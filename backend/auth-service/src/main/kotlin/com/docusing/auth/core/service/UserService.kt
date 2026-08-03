package com.docusing.auth.core.service

import com.docusing.auth.domain.model.UserEntity
import com.docusing.auth.domain.model.UserStatus
import com.docusing.auth.domain.repository.UserRepository
import jakarta.persistence.EntityNotFoundException
import mu.KotlinLogging
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

private val logger = KotlinLogging.logger {}

@Service
class UserService(
    private val userRepository: UserRepository
) {
    @Transactional(readOnly = true)
    fun findByEmail(email: String): UserEntity? = userRepository.findByEmail(email).orElse(null)

    @Transactional
    fun registerUser(email: String, fullName: String): UserEntity {
        val existing = userRepository.findByEmail(email).orElse(null)
        if (existing != null) {
            logger.info { "Usuario ya registrado: $email" }
            return existing
        }
        
        // Generar userId determinístico basado en email
        // Esto asegura que si el usuario ya tiene firmas guardadas como invitado,
        // se mantengan cuando cree su cuenta
        val userId = generateUserIdFromEmail(email)
        
        val entity = UserEntity(
            id = userId,
            email = email.lowercase(),
            fullName = fullName
        )
        return userRepository.save(entity)
    }
    
    /**
     * Genera un UUID determinístico a partir de un email.
     * IMPORTANTE: Este algoritmo DEBE ser idéntico al usado en signature-service
     * para garantizar que las firmas guardadas por invitados se mantengan al crear cuenta.
     */
    private fun generateUserIdFromEmail(email: String): UUID {
        val normalizedEmail = email.lowercase().trim()
        // Usar UUID v5 (namespace-based) para generar ID determinístico
        // Namespace DNS UUID: 6ba7b810-9dad-11d1-80b4-00c04fd430c8
        val namespace = UUID.fromString("6ba7b810-9dad-11d1-80b4-00c04fd430c8")
        return UUID.nameUUIDFromBytes("$namespace:$normalizedEmail".toByteArray())
    }

    @Transactional(readOnly = true)
    fun getById(id: UUID): UserEntity = userRepository.findById(id)
        .orElseThrow { EntityNotFoundException("Usuario no encontrado") }

    @Transactional(readOnly = true)
    fun ensureActive(user: UserEntity): UserEntity {
        if (user.status != UserStatus.ACTIVE) {
            throw IllegalStateException("Usuario inactivo")
        }
        return user
    }
}
