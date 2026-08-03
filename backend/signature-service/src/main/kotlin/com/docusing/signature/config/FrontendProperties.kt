package com.docusing.signature.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.stereotype.Component

@Component
@ConfigurationProperties(prefix = "app.frontend")
data class FrontendProperties(
    var baseUrl: String = ""
)
