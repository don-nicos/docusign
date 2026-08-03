package com.docusing.auth.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "app.frontend")
data class FrontendProperties(
    val baseUrl: String
)
