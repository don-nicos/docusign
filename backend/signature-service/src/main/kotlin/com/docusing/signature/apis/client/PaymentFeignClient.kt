package com.docusing.signature.apis.client

import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import java.time.Instant
import java.util.UUID

@FeignClient(
    name = "payment-service",
    url = "\${payment.service.base-url}"
)
interface PaymentFeignClient {

    @GetMapping("/api/payments/subscriptions/{userId}/status")
    fun getSubscriptionStatus(
        @PathVariable userId: UUID
    ): SubscriptionAccessStatusResponse
}

data class SubscriptionAccessStatusResponse(
    val active: Boolean,
    val currentPeriodEnd: Instant?
)
