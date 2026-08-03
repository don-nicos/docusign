package com.docusing.payment.common.dto.response

import com.docusing.payment.domain.model.ChargeStatus
import com.docusing.payment.domain.model.SubscriptionProvider
import com.docusing.payment.domain.model.SubscriptionStatus
import jakarta.validation.constraints.NotBlank
import java.time.Instant

data class PricingConfigResponse(
    val currency: String,
    val ivaRate: String
)

data class PlanResponse(
    val planKey: String,
    val name: String,
    val periodMonths: Int,
    val netAmountClp: Int,
    val currency: String,
    val ivaRate: String,
    val taxAmountClp: Int,
    val grossAmountClp: Int
)

data class CreateSubscriptionRequest(
    @field:NotBlank
    val planKey: String
)

data class SubscriptionResponse(
    val id: String,
    val userId: String,
    val planKey: String,
    val provider: SubscriptionProvider,
    val providerSubscriptionId: String?,
    val status: SubscriptionStatus,
    val startedAt: Instant?,
    val currentPeriodEnd: Instant?,
    val cancelAtPeriodEnd: Boolean
)

data class ChargeResponse(
    val id: String,
    val status: ChargeStatus,
    val currency: String,
    val amountNetClp: Int,
    val amountTaxClp: Int,
    val amountGrossClp: Int,
    val paidAt: Instant?
)

data class SubscriptionWithChargeResponse(
    val subscription: SubscriptionResponse,
    val lastCharge: ChargeResponse?,
    val checkoutUrl: String? = null
)

data class SubscriptionAccessStatusResponse(
    val active: Boolean,
    val currentPeriodEnd: Instant?
)
