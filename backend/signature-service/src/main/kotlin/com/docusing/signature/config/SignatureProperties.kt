package com.docusing.signature.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.stereotype.Component

@Component
@ConfigurationProperties(prefix = "signature")
data class SignatureProperties(
    var enforceOrder: Boolean = false,
    var backfillEnabled: Boolean = true,
    var backfillBatchSize: Int = 20,
    var backfillFixedDelayMs: Long = 600_000
)
