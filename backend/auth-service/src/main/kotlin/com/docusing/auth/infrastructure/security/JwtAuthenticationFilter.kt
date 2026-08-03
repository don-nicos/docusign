package com.docusing.auth.infrastructure.security

import com.docusing.auth.core.service.JwtService
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import java.util.UUID
import mu.KotlinLogging
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

private val logger = KotlinLogging.logger {}

@Component
class JwtAuthenticationFilter(
    private val jwtService: JwtService
) : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val authHeader = request.getHeader("Authorization")

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response)
            return
        }

        val token = authHeader.substring(7)

        try {
            val payload = jwtService.verifyAccessToken(token)
            
            if (payload != null && payload.email != null) {
                val userId = UUID.fromString(payload.userId)
                val authenticatedUser = AuthenticatedUser(
                    userId = userId,
                    email = payload.email
                )

                val authentication = UsernamePasswordAuthenticationToken(
                    authenticatedUser,
                    null,
                    emptyList()
                )
                authentication.details = WebAuthenticationDetailsSource().buildDetails(request)

                SecurityContextHolder.getContext().authentication = authentication
                logger.debug { "Usuario autenticado: ${payload.email}" }
            }
        } catch (e: Exception) {
            logger.warn { "Token JWT inválido o expirado: ${e.message}" }
        }

        filterChain.doFilter(request, response)
    }
}
