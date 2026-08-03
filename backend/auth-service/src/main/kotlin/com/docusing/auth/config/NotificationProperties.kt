package com.docusing.auth.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "notification.service")
data class NotificationProperties(
    val baseUrl: String
)
