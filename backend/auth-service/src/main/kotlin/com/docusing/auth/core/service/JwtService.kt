package com.docusing.auth.core.service

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import com.auth0.jwt.exceptions.JWTVerificationException
import com.docusing.auth.config.JwtProperties
import com.docusing.auth.domain.model.UserEntity
import java.time.Clock
import java.time.Instant
import java.util.Date
import java.util.UUID
import mu.KotlinLogging
import org.springframework.stereotype.Service

private val logger = KotlinLogging.logger {}

@Service
class JwtService(
    private val jwtProperties: JwtProperties,
    private val clock: Clock
) {
    private val algorithm: Algorithm = Algorithm.HMAC256(jwtProperties.secret)

    fun generateAccessToken(user: UserEntity): JwtToken {
        val issuedAt = Instant.now(clock)
        val expiresAt = issuedAt.plus(jwtProperties.accessTokenTtl)
        val token = JWT.create()
            .withSubject(user.id.toString())
            .withClaim("email", user.email)
            .withClaim("fullName", user.fullName)
            .withClaim("type", "access")
            .withIssuedAt(Date.from(issuedAt))
            .withExpiresAt(Date.from(expiresAt))
            .sign(algorithm)
        return JwtToken(token, expiresAt)
    }

    fun generateRefreshToken(user: UserEntity): JwtToken {
        val issuedAt = Instant.now(clock)
        val expiresAt = issuedAt.plus(jwtProperties.refreshTokenTtl)
        val token = JWT.create()
            .withSubject(user.id.toString())
            .withClaim("type", "refresh")
            .withJWTId(UUID.randomUUID().toString())
            .withIssuedAt(Date.from(issuedAt))
            .withExpiresAt(Date.from(expiresAt))
            .sign(algorithm)
        return JwtToken(token, expiresAt)
    }

    fun verifyAccessToken(token: String): AccessTokenPayload? = try {
        val verifier = JWT.require(algorithm)
            .withClaim("type", "access")
            .build()
        val decodedJWT = verifier.verify(token)
        AccessTokenPayload(
            userId = decodedJWT.subject,
            email = decodedJWT.getClaim("email").asString(),
            fullName = decodedJWT.getClaim("fullName").asString(),
            expiresAt = decodedJWT.expiresAtAsInstant
        )
    } catch (ex: JWTVerificationException) {
        logger.warn(ex) { "Token de acceso inválido" }
        null
    }

    fun verifyRefreshToken(token: String): RefreshTokenPayload? = try {
        val verifier = JWT.require(algorithm)
            .withClaim("type", "refresh")
            .build()
        val decodedJWT = verifier.verify(token)
        RefreshTokenPayload(
            userId = decodedJWT.subject,
            expiresAt = decodedJWT.expiresAtAsInstant
        )
    } catch (ex: JWTVerificationException) {
        logger.warn(ex) { "Token refresh inválido" }
        null
    }
}

data class JwtToken(
    val token: String,
    val expiresAt: Instant
)

data class AccessTokenPayload(
    val userId: String,
    val email: String?,
    val fullName: String?,
    val expiresAt: Instant
)

data class RefreshTokenPayload(
    val userId: String,
    val expiresAt: Instant
)
