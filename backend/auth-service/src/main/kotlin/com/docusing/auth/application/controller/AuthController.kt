package com.docusing.auth.application.controller

import com.docusing.auth.common.dto.request.*
import com.docusing.auth.common.dto.response.*
import com.docusing.auth.infrastructure.security.AuthenticatedUser
import com.docusing.auth.core.service.AuthService
import com.docusing.auth.core.service.JwtService
import com.docusing.auth.core.exception.MagicLinkExpiredException
import com.docusing.auth.core.exception.MagicLinkConsumedException
import com.docusing.auth.core.exception.MagicLinkInvalidTokenException
import jakarta.validation.Valid
import mu.KotlinLogging
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

private val logger = KotlinLogging.logger {}

@RestController
@RequestMapping(com.docusing.auth.common.web.ApiRoutes.Auth.BASE)
class AuthController(
    private val authService: AuthService,
    private val jwtService: JwtService
) {
    @PostMapping("/login")
    fun login(@Valid @RequestBody request: LoginPasswordRequest): AuthSessionResponse {
        val session = authService.loginWithPassword(request.email, request.password)
        logger.info { "Login por contraseña: ${'$'}{request.email}" }
        return AuthSessionResponse(
            user = session.user,
            tokens = session.tokens,
            redirectPath = session.redirectPath
        )
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    fun register(@Valid @RequestBody request: RegisterUserRequest): Map<String, String> {
        authService.registerUser(request.email, request.fullName, request.redirectPath)
        logger.info { "Usuario registrado: ${request.email}" }
        return mapOf("message" to "Usuario registrado. Se ha enviado un magic link a tu correo.")
    }

    @PostMapping("/magic-link/request")
    fun requestMagicLink(@Valid @RequestBody request: MagicLinkRequest): Map<String, String> {
        authService.requestMagicLink(request.email, request.redirectPath)
        logger.info { "Magic link solicitado: ${request.email}" }
        return mapOf("message" to "Magic link enviado a tu correo.")
    }

    @PostMapping("/magic-link/exchange")
    fun exchangeMagicLink(@Valid @RequestBody request: MagicLinkTokenRequest): AuthSessionResponse {
        val session = authService.exchangeMagicLink(request.token)
        logger.info { "Magic link intercambiado: ${session.user.email}" }
        return AuthSessionResponse(
            user = session.user,
            tokens = session.tokens,
            redirectPath = session.redirectPath
        )
    }

    @PostMapping("/refresh")
    fun refreshToken(@Valid @RequestBody request: RefreshTokenRequest): AuthSessionResponse {
        val tokens = authService.refreshTokens(request.refreshToken)
        val refreshPayload = jwtService.verifyRefreshToken(request.refreshToken)
            ?: throw org.springframework.web.server.ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Token inválido"
            )
        val userId = java.util.UUID.fromString(refreshPayload.userId)
        val user = authService.getUserProfile(userId)
        logger.info { "Token refrescado para usuario: ${user.email}" }
        return AuthSessionResponse(
            user = user,
            tokens = tokens,
            redirectPath = null
        )
    }

    @GetMapping("/me")
    fun getCurrentUser(@AuthenticationPrincipal authenticatedUser: AuthenticatedUser): UserResponse {
        return authService.getUserProfile(authenticatedUser.userId)
    }

    @ExceptionHandler(MagicLinkExpiredException::class)
    fun handleMagicLinkExpired(ex: MagicLinkExpiredException): ResponseEntity<Map<String, Any>> {
        return ResponseEntity.status(HttpStatus.GONE).body(
            mapOf(
                "error" to "MAGIC_LINK_EXPIRED",
                "message" to "El enlace de acceso ha expirado. Por favor, solicita uno nuevo."
            )
        )
    }

    @ExceptionHandler(MagicLinkConsumedException::class)
    fun handleMagicLinkConsumed(ex: MagicLinkConsumedException): ResponseEntity<Map<String, Any>> {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            mapOf(
                "error" to "MAGIC_LINK_CONSUMED",
                "message" to "Este enlace de acceso ya fue utilizado. Por favor, solicita uno nuevo."
            )
        )
    }

    @ExceptionHandler(MagicLinkInvalidTokenException::class)
    fun handleMagicLinkInvalid(ex: MagicLinkInvalidTokenException): ResponseEntity<Map<String, Any>> {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            mapOf(
                "error" to "MAGIC_LINK_INVALID",
                "message" to "El enlace de acceso no es válido."
            )
        )
    }
}
