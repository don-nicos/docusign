package com.docusing.auth.config

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.Duration

@ConfigurationProperties(prefix = "magic-link")
data class MagicLinkProperties(
    val expirationMinutes: Long,
    val resendMinutes: Long
) {
    val tokenTtl: Duration = Duration.ofMinutes(expirationMinutes)
    val resendInterval: Duration = Duration.ofMinutes(resendMinutes)
}
