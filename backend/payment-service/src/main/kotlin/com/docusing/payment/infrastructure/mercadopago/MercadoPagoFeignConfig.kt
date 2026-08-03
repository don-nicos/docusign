package com.docusing.payment.infrastructure.mercadopago

import com.docusing.payment.config.MercadoPagoProperties
import feign.RequestInterceptor
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class MercadoPagoFeignConfig(
    private val properties: MercadoPagoProperties
) {

    @Bean
    fun mercadoPagoAuthInterceptor(): RequestInterceptor {
        return RequestInterceptor { template ->
            val token = properties.accessToken
            if (token.isNotBlank()) {
                template.header("Authorization", "Bearer $token")
            }
        }
    }
}
