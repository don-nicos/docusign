package com.docusing.signature.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "notification.service")
data class NotificationServiceProperties(
    val baseUrl: String
)
