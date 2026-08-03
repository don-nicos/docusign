package com.docusing.document.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "storage")
data class StorageProperties(
    val local: LocalProperties
) {
    data class LocalProperties(
        val basePath: String
    )
}
