package com.docusing.auth.config

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.Duration

@ConfigurationProperties(prefix = "jwt")
data class JwtProperties(
    val secret: String,
    val expirationMinutes: Long,
    val refreshExpirationMinutes: Long
) {
    val accessTokenTtl: Duration = Duration.ofMinutes(expirationMinutes)
    val refreshTokenTtl: Duration = Duration.ofMinutes(refreshExpirationMinutes)
}
