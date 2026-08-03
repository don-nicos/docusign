package com.docusing.auth.core.service

import com.docusing.auth.core.exception.MagicLinkThrottleException
import com.docusing.auth.core.exception.MagicLinkInvalidTokenException
import com.docusing.auth.core.exception.MagicLinkExpiredException
import com.docusing.auth.core.exception.MagicLinkConsumedException

import com.docusing.auth.config.FrontendProperties
import com.docusing.auth.config.MagicLinkProperties
import com.docusing.auth.domain.model.MagicLinkTokenEntity
import com.docusing.auth.domain.model.UserEntity
import com.docusing.auth.domain.repository.MagicLinkTokenRepository
import com.docusing.auth.infrastructure.client.NotificationFeignClient
import com.docusing.auth.infrastructure.client.MagicLinkEmailRequest
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.time.Clock
import java.time.Instant
import java.util.UUID
import mu.KotlinLogging
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

private val logger = KotlinLogging.logger {}

@Service
class MagicLinkService(
    private val magicLinkTokenRepository: MagicLinkTokenRepository,
    private val magicLinkProperties: MagicLinkProperties,
    private val frontendProperties: FrontendProperties,
    private val notificationFeignClient: NotificationFeignClient,
    private val clock: Clock
) {
    @Transactional
    fun generateAndSend(user: UserEntity, rawRedirectPath: String?): MagicLinkTokenEntity {
        cleanupExpiredTokens()
        enforceThrottle(user.email)
        val normalizedEmail = user.email.lowercase()
        val now = Instant.now(clock)
        val redirectPath = sanitizeRedirectPath(rawRedirectPath)
        val tokenValue = generateToken()
        val entity = MagicLinkTokenEntity(
            token = tokenValue,
            email = normalizedEmail,
            redirectPath = redirectPath,
            expiresAt = now.plus(magicLinkProperties.tokenTtl)
        ).apply {
            lastSentAt = now
        }
        val saved = magicLinkTokenRepository.save(entity)
        val link = buildMagicLink(tokenValue, redirectPath)
        runCatching {
            notificationFeignClient.sendMagicLinkEmail(
                MagicLinkEmailRequest(
                    email = normalizedEmail,
                    fullName = user.fullName,
                    magicLinkUrl = link
                )
            )
        }.onFailure { ex ->
            logger.warn(ex) { "Error al enviar magic link a $normalizedEmail" }
        }
        logger.info { "Magic link generado para ${user.id} (${user.email})" }
        return saved
    }

    @Transactional
    fun consumeToken(token: String): MagicLinkTokenEntity {
        val normalizedToken = token.trim()
        val entity = magicLinkTokenRepository.findByToken(normalizedToken)
            .orElseThrow { MagicLinkInvalidTokenException() }
        val now = Instant.now(clock)
        if (entity.consumedAt != null) {
            throw MagicLinkConsumedException()
        }
        if (entity.expiresAt.isBefore(now)) {
            throw MagicLinkExpiredException()
        }
        entity.consumedAt = now
        magicLinkTokenRepository.save(entity)
        logger.info { "Magic link consumido para ${entity.email}" }
        return entity
    }

    private fun cleanupExpiredTokens() {
        val reference = Instant.now(clock)
        magicLinkTokenRepository.deleteExpiredTokens(reference)
    }

    private fun enforceThrottle(email: String) {
        val lastToken = magicLinkTokenRepository.findTopByEmailOrderByCreatedAtDesc(email.lowercase())
            .orElse(null)
        val resendInterval = magicLinkProperties.resendInterval
        val now = Instant.now(clock)
        if (lastToken?.lastSentAt != null) {
            val availableAt = lastToken.lastSentAt!!.plus(resendInterval)
            if (availableAt.isAfter(now)) {
                throw MagicLinkThrottleException(availableAt)
            }
        }
    }

    private fun sanitizeRedirectPath(raw: String?): String? {
        if (raw.isNullOrBlank()) {
            return null
        }
        val trimmed = raw.trim()
        return if (trimmed.startsWith("/")) trimmed else "/$trimmed"
    }

    private fun buildMagicLink(token: String, redirectPath: String?): String {
        val baseUrl = frontendProperties.baseUrl.trimEnd('/')
        val encodedToken = URLEncoder.encode(token, StandardCharsets.UTF_8)
        val builder = StringBuilder()
        
        // Siempre enviar a /auth/callback para procesar el magic link
        builder.append(baseUrl).append("/auth/callback").append("?token=").append(encodedToken)
        
        // Si hay redirectPath, agregarlo como parámetro para redirigir después de autenticar
        redirectPath?.let {
            val encodedRedirect = URLEncoder.encode(it, StandardCharsets.UTF_8)
            builder.append("&redirect=").append(encodedRedirect)
        }
        
        return builder.toString()
    }

    private fun generateToken(): String = UUID.randomUUID().toString().replace("-", "")
}
