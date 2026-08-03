package com.docusing.payment.infrastructure.mercadopago

import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody

@FeignClient(
    name = "mercadopago",
    url = "\${mercadopago.base-url}",
    configuration = [MercadoPagoFeignConfig::class]
)
interface MercadoPagoFeignClient {

    @PostMapping("/checkout/preferences")
    fun createPreference(@RequestBody request: MercadoPagoCreatePreferenceRequest): MercadoPagoCreatePreferenceResponse

    @GetMapping("/v1/payments/{id}")
    fun getPayment(@PathVariable("id") id: Long): MercadoPagoPaymentResponse
}

data class MercadoPagoCreatePreferenceRequest(
    val items: List<MercadoPagoItemRequest>,
    val external_reference: String,
    val notification_url: String,
    val back_urls: MercadoPagoBackUrlsRequest,
    val auto_return: String? = null,
    val metadata: Map<String, Any?>? = null
)

data class MercadoPagoItemRequest(
    val title: String,
    val description: String? = null,
    val quantity: Int = 1,
    val currency_id: String,
    val unit_price: Int
)

data class MercadoPagoBackUrlsRequest(
    val success: String,
    val pending: String,
    val failure: String
)

data class MercadoPagoCreatePreferenceResponse(
    val id: String,
    val init_point: String,
    val sandbox_init_point: String?
)

data class MercadoPagoPaymentResponse(
    val id: Long,
    val status: String?,
    val external_reference: String?,
    val metadata: Map<String, Any?>?
)
