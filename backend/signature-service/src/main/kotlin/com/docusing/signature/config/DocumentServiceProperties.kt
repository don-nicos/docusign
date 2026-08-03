package com.docusing.signature.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.stereotype.Component

@Component
@ConfigurationProperties(prefix = "document.service")
data class DocumentServiceProperties(
    var baseUrl: String = ""
)
