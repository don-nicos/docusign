package com.docusing.payment.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.time.Clock

@Configuration
class PaymentAppConfig {
    @Bean
    fun clock(): Clock = Clock.systemUTC()
}
