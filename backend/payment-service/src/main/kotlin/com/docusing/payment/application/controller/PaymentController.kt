package com.docusing.payment.application.controller

import com.docusing.payment.common.dto.response.CreateSubscriptionRequest
import com.docusing.payment.common.dto.response.PricingConfigResponse
import com.docusing.payment.common.dto.response.PlanResponse
import com.docusing.payment.common.dto.response.SubscriptionAccessStatusResponse
import com.docusing.payment.common.dto.response.SubscriptionWithChargeResponse
import com.docusing.payment.core.service.SubscriptionService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/payments")
class PaymentController(
    private val subscriptionService: SubscriptionService
) {

    @GetMapping("/pricing")
    fun getPricing(): PricingConfigResponse = subscriptionService.getPricingConfigResponse()

    @GetMapping("/plans")
    fun listPlans(): List<PlanResponse> = subscriptionService.listPlans()

    @PostMapping("/subscriptions")
    @ResponseStatus(HttpStatus.CREATED)
    fun createSubscription(
        @RequestHeader("X-User-Id") userId: String,
        @Valid @RequestBody request: CreateSubscriptionRequest
    ): SubscriptionWithChargeResponse {
        return subscriptionService.createSubscription(UUID.fromString(userId), request.planKey)
    }

    @GetMapping("/subscriptions/me")
    fun getMySubscription(
        @RequestHeader("X-User-Id") userId: String
    ): SubscriptionWithChargeResponse? {
        return subscriptionService.getLatestSubscription(UUID.fromString(userId))
    }

    @GetMapping("/subscriptions/me/status")
    fun getMySubscriptionStatus(
        @RequestHeader("X-User-Id") userId: String,
        @org.springframework.web.bind.annotation.RequestParam(name = "organizationId", required = false) organizationId: String?
    ): SubscriptionAccessStatusResponse {
        val orgId = organizationId?.takeIf { it.isNotBlank() }?.let { UUID.fromString(it) }
        val (active, end) = subscriptionService.isActive(UUID.fromString(userId), orgId)
        return SubscriptionAccessStatusResponse(active = active, currentPeriodEnd = end)
    }

    @GetMapping("/subscriptions/{userId}/status")
    fun getSubscriptionStatus(
        @PathVariable userId: UUID,
        @org.springframework.web.bind.annotation.RequestParam(name = "organizationId", required = false) organizationId: String?
    ): SubscriptionAccessStatusResponse {
        val orgId = organizationId?.takeIf { it.isNotBlank() }?.let { UUID.fromString(it) }
        val (active, end) = subscriptionService.isActive(userId, orgId)
        return SubscriptionAccessStatusResponse(active = active, currentPeriodEnd = end)
    }
}
