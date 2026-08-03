package com.docusing.notification.controller

import com.docusing.notification.dto.MagicLinkEmailRequest
import com.docusing.notification.dto.NotificationResponse
import com.docusing.notification.dto.OtpEmailRequest
import com.docusing.notification.dto.SignatureCompletedRequest
import com.docusing.notification.dto.SubscriptionExpiringEmailRequest
import com.docusing.notification.service.EmailService
import jakarta.validation.Valid
import mu.KotlinLogging
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

private val logger = KotlinLogging.logger {}

@RestController
@RequestMapping("/notifications")
class NotificationController(
    private val emailService: EmailService
) {

    @PostMapping("/magic-link")
    @ResponseStatus(HttpStatus.OK)
    fun sendMagicLink(@Valid @RequestBody request: MagicLinkEmailRequest): NotificationResponse {
        logger.info { "Solicitud de envío de magic link para: ${request.email}" }
        emailService.sendMagicLinkEmail(request.email, request.fullName, request.magicLinkUrl)
        return NotificationResponse(
            success = true,
            message = "Magic link enviado correctamente"
        )
    }

    @PostMapping("/signature-otp")
    @ResponseStatus(HttpStatus.OK)
    fun sendSignatureOtp(@Valid @RequestBody request: OtpEmailRequest): NotificationResponse {
        logger.info { "Solicitud de envío de OTP para firma: ${request.email}" }
        emailService.sendOtpEmail(request.email, request.fullName, request.otp, request.documentTitle)
        return NotificationResponse(
            success = true,
            message = "OTP enviado correctamente"
        )
    }

    @PostMapping("/signature-completed")
    @ResponseStatus(HttpStatus.OK)
    fun sendSignatureCompleted(@Valid @RequestBody request: SignatureCompletedRequest): NotificationResponse {
        logger.info { "Notificación de firma completada para: ${request.email}" }
        emailService.sendSignatureCompletedEmail(request.email, request.documentTitle)
        return NotificationResponse(
            success = true,
            message = "Notificación enviada correctamente"
        )
    }

    @PostMapping("/subscription-expiring")
    @ResponseStatus(HttpStatus.OK)
    fun sendSubscriptionExpiring(@Valid @RequestBody request: SubscriptionExpiringEmailRequest): NotificationResponse {
        logger.info { "Recordatorio de suscripción por vencer para: ${request.email}" }
        emailService.sendSubscriptionExpiringEmail(
            request.email,
            request.fullName,
            request.planName,
            request.currentPeriodEnd,
            request.daysBeforeExpiry
        )
        return NotificationResponse(
            success = true,
            message = "Recordatorio enviado correctamente"
        )
    }
}
