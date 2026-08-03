package com.docusing.payment.infrastructure.mercadopago

import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component
import org.springframework.web.server.ResponseStatusException

@Component
class MercadoPagoFeignGateway(
    private val client: MercadoPagoFeignClient
) : MercadoPagoGateway {

    override fun createCheckoutPreference(command: CreateCheckoutPreferenceCommand): MercadoPagoCheckoutPreference {
        val response = try {
            client.createPreference(
                MercadoPagoCreatePreferenceRequest(
                    items = listOf(
                        MercadoPagoItemRequest(
                            title = command.title,
                            description = command.description,
                            quantity = 1,
                            currency_id = command.currency,
                            unit_price = command.amountGross
                        )
                    ),
                    external_reference = command.externalReference,
                    notification_url = command.notificationUrl,
                    back_urls = MercadoPagoBackUrlsRequest(
                        success = command.successUrl,
                        pending = command.pendingUrl,
                        failure = command.failureUrl
                    ),
                    auto_return = "approved",
                    metadata = command.metadata
                )
            )
        } catch (ex: Exception) {
            throw ResponseStatusException(HttpStatus.BAD_GATEWAY, "Error Mercado Pago: ${ex.message}")
        }

        return MercadoPagoCheckoutPreference(
            preferenceId = response.id,
            checkoutUrl = response.init_point,
            sandboxCheckoutUrl = response.sandbox_init_point
        )
    }

    override fun getPayment(paymentId: Long): MercadoPagoPaymentInfo {
        val payment = try {
            client.getPayment(paymentId)
        } catch (ex: Exception) {
            throw ResponseStatusException(HttpStatus.BAD_GATEWAY, "Error Mercado Pago: ${ex.message}")
        }

        return MercadoPagoPaymentInfo(
            id = payment.id,
            status = payment.status,
            externalReference = payment.external_reference,
            metadata = payment.metadata
        )
    }
}
