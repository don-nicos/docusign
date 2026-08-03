package com.docusing.payment.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "mercadopago")
data class MercadoPagoProperties(
    val enabled: Boolean = false,
    val client: String = "sdk",
    val baseUrl: String = "https://api.mercadopago.com",
    val publicKey: String = "",
    val accessToken: String = "",
    val webhookSecret: String = "",
    val notificationUrl: String = ""
)
