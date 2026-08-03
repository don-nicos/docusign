package com.docusing.payment.infrastructure.mercadopago

import com.docusing.payment.config.MercadoPagoProperties
import org.springframework.context.annotation.Primary
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class MercadoPagoGatewayConfig(
    private val properties: MercadoPagoProperties,
    private val sdkGateway: MercadoPagoSdkGateway,
    private val feignGateway: MercadoPagoFeignGateway
) {

    @Bean
    @Primary
    fun mercadoPagoGateway(): MercadoPagoGateway {
        return when (properties.client.trim().lowercase()) {
            "feign" -> feignGateway
            else -> sdkGateway
        }
    }
}
