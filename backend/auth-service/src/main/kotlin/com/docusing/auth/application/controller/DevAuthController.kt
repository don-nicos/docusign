package com.docusing.auth.application.controller

import com.docusing.auth.common.dto.response.AuthTokensResponse
import com.docusing.auth.domain.model.UserEntity
import com.docusing.auth.domain.model.UserStatus
import com.docusing.auth.domain.repository.UserRepository
import com.docusing.auth.core.service.JwtService
import mu.KotlinLogging
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.time.Instant
import java.util.UUID

private val logger = KotlinLogging.logger {}
/**
 * SOLO PARA DESARROLLO - Endpoint para obtener tokens de acceso sin validación
 */
@RestController
@RequestMapping("/api/dev")
class DevAuthController(
    private val userRepository: UserRepository,
    private val jwtService: JwtService,
    private val passwordEncoder: PasswordEncoder
) {
    
    @GetMapping("/hash")
    fun generateHash(@RequestParam password: String): Map<String, String> {
        val hash = passwordEncoder.encode(password)
        return mapOf(
            "password" to password,
            "hash" to hash,
            "matches" to passwordEncoder.matches(password, hash).toString()
        )
    }

    @PostMapping("/login")
    @ResponseStatus(HttpStatus.OK)
    @Transactional
    fun devLogin(@RequestBody request: DevLoginRequest): DevLoginResponse {
        logger.warn { "⚠️ DEV LOGIN usado para email: ${request.email}" }
        
        // Buscar o crear usuario
        val user = userRepository.findByEmail(request.email).orElseGet {
            val newUser = UserEntity(
                email = request.email,
                fullName = request.fullName ?: "Usuario de Prueba",
                status = UserStatus.ACTIVE,
                createdAt = Instant.now(),
                updatedAt = Instant.now()
            )
            userRepository.save(newUser)
        }

        // Generar tokens
        val accessToken = jwtService.generateAccessToken(user)
        val refreshToken = jwtService.generateRefreshToken(user)

        logger.info { "✅ Token generado para: ${user.email} (ID: ${user.id})" }

        return DevLoginResponse(
            userId = user.id.toString(),
            email = user.email,
            fullName = user.fullName,
            accessToken = accessToken.token,
            refreshToken = refreshToken.token,
            message = "⚠️ Tokens de desarrollo generados. NO usar en producción."
        )
    }
}

data class DevLoginRequest(
    val email: String,
    val fullName: String? = null
)

data class DevLoginResponse(
    val userId: String,
    val email: String,
    val fullName: String,
    val accessToken: String,
    val refreshToken: String,
    val message: String
)
