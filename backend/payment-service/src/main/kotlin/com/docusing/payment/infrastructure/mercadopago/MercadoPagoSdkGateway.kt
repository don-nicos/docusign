package com.docusing.payment.infrastructure.mercadopago

import com.docusing.payment.config.MercadoPagoProperties
import com.mercadopago.MercadoPagoConfig
import com.mercadopago.client.payment.PaymentClient
import com.mercadopago.client.preference.PreferenceBackUrlsRequest
import com.mercadopago.client.preference.PreferenceClient
import com.mercadopago.client.preference.PreferenceItemRequest
import com.mercadopago.client.preference.PreferenceRequest
import com.mercadopago.exceptions.MPApiException
import com.mercadopago.exceptions.MPException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component
import org.springframework.web.server.ResponseStatusException
import java.math.BigDecimal

@Component
class MercadoPagoSdkGateway(
    private val properties: MercadoPagoProperties
) : MercadoPagoGateway {

    override fun createCheckoutPreference(command: CreateCheckoutPreferenceCommand): MercadoPagoCheckoutPreference {
        val accessToken = properties.accessToken
        if (accessToken.isBlank()) {
            throw ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Mercado Pago access token no configurado")
        }

        MercadoPagoConfig.setAccessToken(accessToken)

        val item = PreferenceItemRequest.builder()
            .title(command.title)
            .description(command.description)
            .quantity(1)
            .currencyId(command.currency)
            .unitPrice(BigDecimal(command.amountGross))
            .build()

        val backUrls = PreferenceBackUrlsRequest.builder()
            .success(command.successUrl)
            .pending(command.pendingUrl)
            .failure(command.failureUrl)
            .build()

        val request = PreferenceRequest.builder()
            .items(listOf(item))
            .externalReference(command.externalReference)
            .metadata(command.metadata)
            .notificationUrl(command.notificationUrl)
            .backUrls(backUrls)
            .autoReturn("approved")
            .build()

        val client = PreferenceClient()

        try {
            val preference = client.create(request)
            val preferenceId = preference.id ?: throw ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Mercado Pago no retornó preference id"
            )
            val initPoint = preference.initPoint ?: throw ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Mercado Pago no retornó init_point"
            )
            return MercadoPagoCheckoutPreference(
                preferenceId = preferenceId,
                checkoutUrl = initPoint,
                sandboxCheckoutUrl = preference.sandboxInitPoint
            )
        } catch (ex: MPApiException) {
            val apiResponseContent = ex.apiResponse?.content ?: "no content"
            val errorDetail = "MPApiException: statusCode=${ex.statusCode}, message=${ex.message}, apiResponse.content=${apiResponseContent}"
            println("ERROR MERCADOPAGO CREATE PREFERENCE: $errorDetail")
            throw ResponseStatusException(HttpStatus.BAD_GATEWAY, "Error Mercado Pago: $errorDetail")
        } catch (ex: MPException) {
            val errorDetail = "MPException: message=${ex.message}, cause=${ex.cause?.message}"
            println("ERROR MERCADOPAGO CREATE PREFERENCE: $errorDetail")
            throw ResponseStatusException(HttpStatus.BAD_GATEWAY, "Error Mercado Pago: $errorDetail")
        }
    }

    override fun getPayment(paymentId: Long): MercadoPagoPaymentInfo {
        val accessToken = properties.accessToken
        if (accessToken.isBlank()) {
            throw ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Mercado Pago access token no configurado")
        }

        MercadoPagoConfig.setAccessToken(accessToken)

        val client = PaymentClient()
        try {
            val payment = client.get(paymentId)
            return MercadoPagoPaymentInfo(
                id = payment.id ?: paymentId,
                status = payment.status,
                externalReference = payment.externalReference,
                metadata = payment.metadata
            )
        } catch (ex: MPApiException) {
            val errorDetail = "MPApiException: statusCode=${ex.statusCode}, message=${ex.message}"
            println("ERROR MERCADOPAGO GET PAYMENT: $errorDetail")
            throw ResponseStatusException(HttpStatus.BAD_GATEWAY, "Error Mercado Pago: $errorDetail")
        } catch (ex: MPException) {
            val errorDetail = "MPException: message=${ex.message}"
            println("ERROR MERCADOPAGO GET PAYMENT: $errorDetail")
            throw ResponseStatusException(HttpStatus.BAD_GATEWAY, "Error Mercado Pago: $errorDetail")
        }
    }
}
