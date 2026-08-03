package com.docusing.auth.core.service

import com.docusing.auth.common.dto.response.AuthTokensResponse
import com.docusing.auth.common.dto.response.MagicLinkResponse
import com.docusing.auth.common.dto.response.UserResponse
import com.docusing.auth.config.AuthProperties
import com.docusing.auth.domain.model.RefreshTokenEntity
import com.docusing.auth.domain.repository.MagicLinkTokenRepository
import com.docusing.auth.domain.repository.RefreshTokenRepository
import com.docusing.auth.common.mapper.AuthMapper
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.UUID
import mu.KotlinLogging
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException

private val logger = KotlinLogging.logger {}

@Service
class AuthService(
    private val userService: UserService,
    private val magicLinkService: MagicLinkService,
    private val jwtService: JwtService,
    private val refreshTokenRepository: RefreshTokenRepository,
    private val magicLinkTokenRepository: MagicLinkTokenRepository,
    private val authMapper: AuthMapper,
    private val authProperties: AuthProperties,
    private val clock: Clock
) {
    private val passwordEncoder = BCryptPasswordEncoder()

    @Transactional
    fun registerUser(email: String, fullName: String, redirectPath: String?): MagicLinkResponse {
        val user = userService.registerUser(email, fullName)
        val magicLink = magicLinkService.generateAndSend(user, redirectPath)
        return MagicLinkResponse(
            email = user.email,
            expiresAt = magicLink.expiresAt,
            redirectPath = magicLink.redirectPath
        )
    }

    @Transactional
    fun loginWithPassword(email: String, rawPassword: String): AuthSessionResult {
        val normalizedEmail = email.trim().lowercase()
        val user = if (authProperties.devMode) {
            // DEV: no validar contraseña; crear usuario si no existe
            logger.warn { "[DEV] Login sin validación de password para: $normalizedEmail" }
            userService.findByEmail(normalizedEmail)
                ?: userService.registerUser(normalizedEmail, normalizedEmail.substringBefore('@'))
        } else {
            val u = userService.findByEmail(normalizedEmail)
                ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario o contraseña inválidos")
            val hash = u.passwordHash
            logger.info { "Auth debug: email=$normalizedEmail hash=$hash" }
            val matches = if (!hash.isNullOrBlank()) passwordEncoder.matches(rawPassword, hash) else false
            logger.info { "Auth debug: password=$rawPassword hashNull=${hash.isNullOrBlank()} matches=$matches" }
            val accepted = !hash.isNullOrBlank() && matches
            if (!accepted) {
                logger.warn { "Login fallido para $normalizedEmail" }
                throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario o contraseña inválidos")
            }
            u
        }

        userService.ensureActive(user)
        val now = Instant.now(clock)

        purgeExpiredRefreshTokens(user, now)

        val accessToken = jwtService.generateAccessToken(user)
        val refreshToken = jwtService.generateRefreshToken(user)
        val refreshEntity = refreshTokenRepository.save(
            RefreshTokenEntity(
                user = user,
                token = refreshToken.token,
                expiresAt = refreshToken.expiresAt
            )
        )

        val tokensResponse = AuthTokensResponse(
            accessToken = accessToken.token,
            refreshToken = refreshToken.token,
            expiresInSeconds = calculateSecondsRemaining(now, accessToken.expiresAt),
            refreshExpiresInSeconds = calculateSecondsRemaining(now, refreshEntity.expiresAt)
        )

        val userResponse = authMapper.toUserResponse(user)
        return AuthSessionResult(
            user = userResponse,
            tokens = tokensResponse,
            redirectPath = "/dashboard"
        )
    }

    @Transactional
    fun requestMagicLink(email: String, redirectPath: String?): MagicLinkResponse {
        val user = userService.findByEmail(email)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado")
        val magicLink = magicLinkService.generateAndSend(user, redirectPath)
        return MagicLinkResponse(
            email = user.email,
            expiresAt = magicLink.expiresAt,
            redirectPath = magicLink.redirectPath
        )
    }

    @Transactional
    fun exchangeMagicLink(token: String): AuthSessionResult {
        val magicLink = magicLinkService.consumeToken(token)
        val user = userService.findByEmail(magicLink.email)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado para token")
        userService.ensureActive(user)
        val now = Instant.now(clock)

        purgeExpiredRefreshTokens(user, now)

        val accessToken = jwtService.generateAccessToken(user)
        val refreshToken = jwtService.generateRefreshToken(user)
        val refreshEntity = refreshTokenRepository.save(
            RefreshTokenEntity(
                user = user,
                token = refreshToken.token,
                expiresAt = refreshToken.expiresAt
            )
        )

        val tokensResponse = AuthTokensResponse(
            accessToken = accessToken.token,
            refreshToken = refreshToken.token,
            expiresInSeconds = calculateSecondsRemaining(now, accessToken.expiresAt),
            refreshExpiresInSeconds = calculateSecondsRemaining(now, refreshEntity.expiresAt)
        )

        val userResponse = authMapper.toUserResponse(user)
        return AuthSessionResult(
            user = userResponse,
            tokens = tokensResponse,
            redirectPath = magicLink.redirectPath
        )
    }

    @Transactional
    fun refreshTokens(refreshTokenValue: String): AuthTokensResponse {
        val payload = jwtService.verifyRefreshToken(refreshTokenValue)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token inválido")
        val tokenEntity = refreshTokenRepository.findByToken(refreshTokenValue)
            .orElseThrow { ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token no registrado") }
        val now = Instant.now(clock)
        if (tokenEntity.revokedAt != null) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token revocado")
        }
        if (tokenEntity.expiresAt.isBefore(now)) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token expirado")
        }
        val userId = runCatching { UUID.fromString(payload.userId) }
            .getOrElse {
                logger.warn(it) { "Refresh token con subject inválido" }
                throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token inválido")
            }
        val user = userService.getById(userId)
        userService.ensureActive(user)

        purgeExpiredRefreshTokens(user, now)
        tokenEntity.revokedAt = now
        refreshTokenRepository.save(tokenEntity)

        val newAccess = jwtService.generateAccessToken(user)
        val newRefresh = jwtService.generateRefreshToken(user)
        val newRefreshEntity = refreshTokenRepository.save(
            RefreshTokenEntity(
                user = user,
                token = newRefresh.token,
                expiresAt = newRefresh.expiresAt
            )
        )

        return AuthTokensResponse(
            accessToken = newAccess.token,
            refreshToken = newRefresh.token,
            expiresInSeconds = calculateSecondsRemaining(now, newAccess.expiresAt),
            refreshExpiresInSeconds = calculateSecondsRemaining(now, newRefreshEntity.expiresAt)
        )
    }

    @Transactional(readOnly = true)
    fun getUserProfile(userId: UUID) = authMapper.toUserResponse(userService.getById(userId))

    private fun purgeExpiredRefreshTokens(user: com.docusing.auth.domain.model.UserEntity, reference: Instant) {
        refreshTokenRepository.deleteAllByUserAndExpiresAtBefore(user, reference)
        magicLinkTokenRepository.deleteExpiredTokens(reference)
    }

    private fun calculateSecondsRemaining(from: Instant, until: Instant): Long {
        val duration = Duration.between(from, until)
        return if (duration.isNegative) 0 else duration.seconds
    }
}

data class AuthSessionResult(
    val user: com.docusing.auth.common.dto.response.UserResponse,
    val tokens: AuthTokensResponse,
    val redirectPath: String?
)
