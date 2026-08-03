package com.docusing.payment.application.controller

import com.docusing.payment.config.MercadoPagoProperties
import com.docusing.payment.domain.model.ChargeStatus
import com.docusing.payment.domain.model.SubscriptionProvider
import com.docusing.payment.domain.model.SubscriptionStatus
import com.docusing.payment.domain.model.WebhookEventEntity
import com.docusing.payment.domain.repository.SubscriptionChargeRepository
import com.docusing.payment.domain.repository.SubscriptionPlanRepository
import com.docusing.payment.domain.repository.SubscriptionRepository
import com.docusing.payment.domain.repository.WebhookEventRepository
import com.docusing.payment.infrastructure.mercadopago.MercadoPagoGateway
import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.transaction.Transactional
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.time.Clock
import java.time.Instant
import java.util.UUID

@RestController
@RequestMapping("/api/payments/webhooks/mercadopago")
class MercadoPagoWebhookController(
    private val mercadoPagoProperties: MercadoPagoProperties,
    private val mercadoPagoGateway: MercadoPagoGateway,
    private val webhookEventRepository: WebhookEventRepository,
    private val subscriptionRepository: SubscriptionRepository,
    private val subscriptionPlanRepository: SubscriptionPlanRepository,
    private val subscriptionChargeRepository: SubscriptionChargeRepository,
    private val objectMapper: ObjectMapper,
    private val clock: Clock
) {

    @PostMapping
    @ResponseStatus(HttpStatus.OK)
    @Transactional
    fun handle(
        @RequestHeader _headers: Map<String, String>,
        @RequestParam params: Map<String, String>,
        @RequestBody(required = false) body: String?
    ): String {
        if (!mercadoPagoProperties.enabled) return "disabled"

        val topic = params["topic"] ?: params["type"]

        val paymentId = extractPaymentId(params, body)

        val event = webhookEventRepository.save(
            WebhookEventEntity(
                provider = "MERCADOPAGO",
                topic = topic,
                eventId = paymentId?.toString(),
                payload = body,
                status = "RECEIVED"
            )
        )

        if (paymentId == null) {
            event.status = "IGNORED"
            event.processedAt = Instant.now(clock)
            webhookEventRepository.save(event)
            return "ok"
        }

        val payment = try {
            mercadoPagoGateway.getPayment(paymentId)
        } catch (ex: Exception) {
            event.status = "ERROR"
            event.processedAt = Instant.now(clock)
            webhookEventRepository.save(event)
            return "ok"
        }

        val externalRef = payment.externalReference
        val chargeId = try {
            if (externalRef.isNullOrBlank()) null else UUID.fromString(externalRef)
        } catch (_: Exception) {
            null
        }

        if (chargeId == null) {
            event.status = "IGNORED"
            event.processedAt = Instant.now(clock)
            webhookEventRepository.save(event)
            return "ok"
        }

        val charge = subscriptionChargeRepository.findById(chargeId).orElse(null)
        if (charge == null) {
            event.status = "IGNORED"
            event.processedAt = Instant.now(clock)
            webhookEventRepository.save(event)
            return "ok"
        }

        val status = payment.status?.lowercase() ?: run {
            event.status = "IGNORED"
            event.processedAt = Instant.now(clock)
            webhookEventRepository.save(event)
            return "ok"
        }

        if (charge.status == ChargeStatus.PAID) {
            event.status = "PROCESSED"
            event.processedAt = Instant.now(clock)
            webhookEventRepository.save(event)
            return "ok"
        }

        val now = Instant.now(clock)

        if (status != "approved") {
            val failureStatuses = setOf("rejected", "cancelled", "charged_back", "refunded")
            if (status in failureStatuses && charge.status == ChargeStatus.PENDING) {
                charge.provider = SubscriptionProvider.MERCADOPAGO
                charge.providerPaymentId = paymentId.toString()
                charge.status = ChargeStatus.FAILED
                charge.paidAt = null
                subscriptionChargeRepository.save(charge)

                val subscription = charge.subscription
                if (subscription.status == SubscriptionStatus.PENDING) {
                    subscription.status = SubscriptionStatus.CANCELLED
                    subscription.cancelledAt = now
                    subscriptionRepository.save(subscription)
                }

                event.status = "PROCESSED"
                event.processedAt = now
                webhookEventRepository.save(event)
                return "ok"
            }

            event.status = "IGNORED"
            event.processedAt = now
            webhookEventRepository.save(event)
            return "ok"
        }

        charge.provider = SubscriptionProvider.MERCADOPAGO
        charge.providerPaymentId = paymentId.toString()
        charge.status = ChargeStatus.PAID
        charge.paidAt = now
        subscriptionChargeRepository.save(charge)

        val subscription = charge.subscription
        val plan = subscriptionPlanRepository.findByPlanKey(subscription.planKey.trim().uppercase())
        val months = plan?.periodMonths?.toLong() ?: 1L

        subscription.provider = SubscriptionProvider.MERCADOPAGO
        subscription.status = SubscriptionStatus.ACTIVE
        if (subscription.startedAt == null) subscription.startedAt = now
        subscription.currentPeriodEnd = now.atZone(clock.zone)
            .plusMonths(months)
            .toInstant()
        subscriptionRepository.save(subscription)

        event.status = "PROCESSED"
        event.processedAt = now
        webhookEventRepository.save(event)

        return "ok"
    }

    private fun extractPaymentId(params: Map<String, String>, body: String?): Long? {
        val direct = params["id"]?.toLongOrNull()
            ?: params["data.id"]?.toLongOrNull()
            ?: params["data_id"]?.toLongOrNull()
        if (direct != null) return direct

        if (body.isNullOrBlank()) return null

        return try {
            val node = objectMapper.readTree(body)
            val dataNode = node.get("data")
            val idNode = dataNode?.get("id") ?: node.get("id")
            idNode?.asLong()
        } catch (_: Exception) {
            null
        }
    }
}
