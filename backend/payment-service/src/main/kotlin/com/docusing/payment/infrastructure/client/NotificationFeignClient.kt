package com.docusing.payment.infrastructure.client

import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import java.time.Instant

@FeignClient(
    name = "notification-service",
    url = "\${notification.service.base-url}"
)
interface NotificationFeignClient {

    @PostMapping("/notifications/subscription-expiring")
    fun sendSubscriptionExpiring(@RequestBody request: SubscriptionExpiringEmailRequest)
}

data class SubscriptionExpiringEmailRequest(
    val email: String,
    val fullName: String? = null,
    val planName: String,
    val currentPeriodEnd: Instant,
    val daysBeforeExpiry: Int
)
