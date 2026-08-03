package com.docusing.payment.infrastructure.mercadopago

data class CreateCheckoutPreferenceCommand(
    val title: String,
    val description: String?,
    val amountGross: Int,
    val currency: String,
    val externalReference: String,
    val metadata: Map<String, Any?> = emptyMap(),
    val successUrl: String,
    val pendingUrl: String,
    val failureUrl: String,
    val notificationUrl: String
)

data class MercadoPagoCheckoutPreference(
    val preferenceId: String,
    val checkoutUrl: String,
    val sandboxCheckoutUrl: String?
)

data class MercadoPagoPaymentInfo(
    val id: Long,
    val status: String?,
    val externalReference: String?,
    val metadata: Map<String, Any?>?
)

interface MercadoPagoGateway {
    fun createCheckoutPreference(command: CreateCheckoutPreferenceCommand): MercadoPagoCheckoutPreference
    fun getPayment(paymentId: Long): MercadoPagoPaymentInfo
}
