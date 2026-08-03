package com.docusing.payment.core.service

import com.docusing.payment.common.dto.response.ChargeResponse
import com.docusing.payment.common.dto.response.PricingConfigResponse
import com.docusing.payment.common.dto.response.PlanResponse
import com.docusing.payment.common.dto.response.SubscriptionResponse
import com.docusing.payment.common.dto.response.SubscriptionWithChargeResponse
import com.docusing.payment.config.FrontendProperties
import com.docusing.payment.config.MercadoPagoProperties
import com.docusing.payment.domain.model.ChargeStatus
import com.docusing.payment.domain.model.PricingConfigEntity
import com.docusing.payment.domain.model.SubscriptionChargeEntity
import com.docusing.payment.domain.model.SubscriptionEntity
import com.docusing.payment.domain.model.SubscriptionProvider
import com.docusing.payment.domain.model.SubscriptionStatus
import com.docusing.payment.domain.repository.PricingConfigRepository
import com.docusing.payment.domain.repository.SubscriptionChargeRepository
import com.docusing.payment.domain.repository.SubscriptionPlanRepository
import com.docusing.payment.domain.repository.SubscriptionRepository
import com.docusing.payment.infrastructure.mercadopago.CreateCheckoutPreferenceCommand
import com.docusing.payment.infrastructure.mercadopago.MercadoPagoGateway
import mu.KotlinLogging
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Clock
import java.time.Instant
import java.util.UUID

private val logger = KotlinLogging.logger {}

@Service
class SubscriptionService(
    private val pricingConfigRepository: PricingConfigRepository,
    private val subscriptionPlanRepository: SubscriptionPlanRepository,
    private val subscriptionRepository: SubscriptionRepository,
    private val subscriptionChargeRepository: SubscriptionChargeRepository,
    private val mercadoPagoProperties: MercadoPagoProperties,
    private val frontendProperties: FrontendProperties,
    private val mercadoPagoGateway: MercadoPagoGateway,
    private val clock: Clock
) {

    @Transactional(readOnly = true)
    fun getPricingConfig(): PricingConfigEntity {
        return pricingConfigRepository.findAll().firstOrNull()
            ?: throw ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No hay configuración de cobro")
    }

    @Transactional(readOnly = true)
    fun getPricingConfigResponse(): PricingConfigResponse {
        val cfg = getPricingConfig()
        return PricingConfigResponse(currency = cfg.currency, ivaRate = cfg.ivaRate.toPlainString())
    }

    @Transactional(readOnly = true)
    fun listPlans(): List<PlanResponse> {
        val cfg = getPricingConfig()
        val ivaRate = cfg.ivaRate
        val plans = subscriptionPlanRepository.findAllByActiveTrueOrderByPeriodMonthsAsc()
        return plans.map { plan ->
            val net = calculateNetClp(
                periodMonths = plan.periodMonths,
                monthlyBaseUsd = cfg.monthlyBaseUsd,
                usdToClpRate = cfg.usdToClpRate,
                discountRate = plan.discountRate
            )
            val tax = calculateTax(net, ivaRate)
            val gross = net + tax
            PlanResponse(
                planKey = plan.planKey,
                name = plan.name,
                periodMonths = plan.periodMonths,
                netAmountClp = net,
                currency = cfg.currency,
                ivaRate = ivaRate.toPlainString(),
                taxAmountClp = tax,
                grossAmountClp = gross
            )
        }
    }

    @Transactional
    fun createSubscription(userId: UUID, planKey: String, organizationId: UUID? = null): SubscriptionWithChargeResponse {
        val normalizedPlanKey = planKey.trim().uppercase()
        val plan = subscriptionPlanRepository.findByPlanKey(normalizedPlanKey)
            ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Plan inválido")

        val now = Instant.now(clock)
        val provider = if (mercadoPagoProperties.enabled) SubscriptionProvider.MERCADOPAGO else SubscriptionProvider.MOCK

        val subscriptionStatus = if (provider == SubscriptionProvider.MERCADOPAGO) SubscriptionStatus.PENDING else SubscriptionStatus.ACTIVE
        val chargeStatus = if (provider == SubscriptionProvider.MERCADOPAGO) ChargeStatus.PENDING else ChargeStatus.PAID
        
        val startedAt = if (provider == SubscriptionProvider.MERCADOPAGO) null else now
        
        val currentPeriodEnd = if (provider == SubscriptionProvider.MERCADOPAGO) {
            null
        } else {
            val existingSubscription = if (organizationId != null) {
                subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)
                    .filter { it.organizationId == organizationId }
                    .filter { it.currentPeriodEnd != null && it.currentPeriodEnd!!.isAfter(now) }
                    .maxByOrNull { it.currentPeriodEnd ?: Instant.EPOCH }
            } else {
                subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)
                    .filter { it.organizationId == null }
                    .filter { it.currentPeriodEnd != null && it.currentPeriodEnd!!.isAfter(now) }
                    .maxByOrNull { it.currentPeriodEnd ?: Instant.EPOCH }
            }
            
            if (existingSubscription != null && existingSubscription.currentPeriodEnd!!.isAfter(now)) {
                existingSubscription.currentPeriodEnd!!.atZone(clock.zone)
                    .plusMonths(plan.periodMonths.toLong())
                    .toInstant()
            } else {
                now.atZone(clock.zone)
                    .plusMonths(plan.periodMonths.toLong())
                    .toInstant()
            }
        }

        val subscription = SubscriptionEntity(
            userId = userId,
            organizationId = organizationId,
            planKey = plan.planKey,
            provider = provider,
            status = subscriptionStatus,
            startedAt = startedAt,
            currentPeriodEnd = currentPeriodEnd,
            cancelAtPeriodEnd = false
        )

        val saved = subscriptionRepository.save(subscription)

        val cfg = getPricingConfig()
        val net = calculateNetClp(
            periodMonths = plan.periodMonths,
            monthlyBaseUsd = cfg.monthlyBaseUsd,
            usdToClpRate = cfg.usdToClpRate,
            discountRate = plan.discountRate
        )
        val tax = calculateTax(net, cfg.ivaRate)
        val gross = net + tax

        val charge = SubscriptionChargeEntity(
            subscription = saved,
            provider = provider,
            currency = cfg.currency,
            amountNetClp = net,
            amountTaxClp = tax,
            amountGrossClp = gross,
            status = chargeStatus,
            paidAt = if (chargeStatus == ChargeStatus.PAID) now else null
        )

        val savedCharge = subscriptionChargeRepository.save(charge)

        val checkoutUrl = if (provider == SubscriptionProvider.MERCADOPAGO) {
            val baseUrl = frontendProperties.baseUrl.trimEnd('/')
            val preference = mercadoPagoGateway.createCheckoutPreference(
                CreateCheckoutPreferenceCommand(
                    title = "Suscripción ${plan.name}",
                    description = "Plan ${plan.planKey}",
                    amountGross = gross,
                    currency = cfg.currency,
                    externalReference = savedCharge.id.toString(),
                    metadata = mapOf(
                        "subscriptionId" to saved.id.toString(),
                        "chargeId" to savedCharge.id.toString(),
                        "userId" to userId.toString(),
                        "planKey" to plan.planKey,
                        "organizationId" to (organizationId?.toString() ?: "")
                    ),
                    successUrl = "$baseUrl/subscription?mp=success&ref=${savedCharge.id}",
                    pendingUrl = "$baseUrl/subscription?mp=pending&ref=${savedCharge.id}",
                    failureUrl = "$baseUrl/subscription?mp=failure&ref=${savedCharge.id}",
                    notificationUrl = mercadoPagoProperties.notificationUrl
                )
            )
            preference.checkoutUrl
        } else {
            null
        }

        logger.info { "Suscripción creada para usuario $userId plan ${plan.planKey} provider=$provider organizationId=$organizationId" }

        return SubscriptionWithChargeResponse(
            subscription = toResponse(saved),
            lastCharge = toChargeResponse(savedCharge),
            checkoutUrl = checkoutUrl
        )
    }

    @Transactional(readOnly = true)
    fun getLatestSubscription(userId: UUID): SubscriptionWithChargeResponse? {
        val now = Instant.now(clock)
        val activeSub = subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)
            .asSequence()
            .filter { it.currentPeriodEnd != null && it.currentPeriodEnd!!.isAfter(now) }
            .maxByOrNull { it.currentPeriodEnd ?: Instant.EPOCH }

        val sub = activeSub ?: subscriptionRepository.findFirstByUserIdOrderByCreatedAtDesc(userId) ?: return null

        val lastCharge = subscriptionChargeRepository.findAll().asSequence()
            .filter { it.subscription.id == sub.id }
            .maxByOrNull { it.createdAt ?: Instant.EPOCH }
        return SubscriptionWithChargeResponse(
            subscription = toResponse(sub),
            lastCharge = lastCharge?.let { toChargeResponse(it) }
        )
    }

    @Transactional(readOnly = true)
    fun isActive(userId: UUID, organizationId: UUID? = null): Pair<Boolean, Instant?> {
        val now = Instant.now(clock)

        val candidates = subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)
            .asSequence()
            .filter { it.currentPeriodEnd != null && it.currentPeriodEnd!!.isAfter(now) }

        val filtered = if (organizationId != null) {
            candidates.filter { it.organizationId == organizationId }
        } else {
            candidates.filter { it.organizationId == null }
        }

        val sub = filtered.maxByOrNull { it.currentPeriodEnd ?: Instant.EPOCH } ?: return false to null

        return true to sub.currentPeriodEnd
    }

    private fun calculateTax(net: Int, ivaRate: BigDecimal): Int {
        val tax = BigDecimal(net).multiply(ivaRate)
        return tax.setScale(0, RoundingMode.HALF_UP).intValueExact()
    }

    private fun calculateNetClp(
        periodMonths: Int,
        monthlyBaseUsd: BigDecimal,
        usdToClpRate: Int,
        discountRate: BigDecimal
    ): Int {
        val months = BigDecimal(periodMonths)
        val clpRate = BigDecimal(usdToClpRate)
        val grossUsdForPeriod = monthlyBaseUsd.multiply(months)
        val discountedUsd = grossUsdForPeriod.multiply(BigDecimal.ONE.subtract(discountRate))
        val clp = discountedUsd.multiply(clpRate)
        return clp.setScale(0, RoundingMode.HALF_UP).intValueExact()
    }

    private fun toResponse(entity: SubscriptionEntity): SubscriptionResponse = SubscriptionResponse(
        id = entity.id.toString(),
        userId = entity.userId.toString(),
        planKey = entity.planKey,
        provider = entity.provider,
        providerSubscriptionId = entity.providerSubscriptionId,
        status = entity.status,
        startedAt = entity.startedAt,
        currentPeriodEnd = entity.currentPeriodEnd,
        cancelAtPeriodEnd = entity.cancelAtPeriodEnd
    )

    private fun toChargeResponse(entity: SubscriptionChargeEntity): ChargeResponse = ChargeResponse(
        id = entity.id.toString(),
        status = entity.status,
        currency = entity.currency,
        amountNetClp = entity.amountNetClp,
        amountTaxClp = entity.amountTaxClp,
        amountGrossClp = entity.amountGrossClp,
        paidAt = entity.paidAt
    )
}
