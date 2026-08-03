package com.docusing.payment.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "payment.reminders")
data class PaymentReminderProperties(
    val enabled: Boolean = true,
    val daysBeforeExpiry: List<Int> = listOf(7, 3, 1)
)
