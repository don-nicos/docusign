package com.docusing.notification.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import java.time.Instant

data class MagicLinkEmailRequest(
    @field:Email
    @field:NotBlank
    val email: String,

    val fullName: String? = null,

    @field:NotBlank
    val magicLinkUrl: String
)

data class OtpEmailRequest(
    @field:Email
    @field:NotBlank
    val email: String,

    val fullName: String? = null,

    @field:NotBlank
    val otp: String,

    @field:NotBlank
    val documentTitle: String
)

data class SubscriptionExpiringEmailRequest(
    @field:Email
    @field:NotBlank
    val email: String,

    val fullName: String? = null,

    @field:NotBlank
    val planName: String,

    val currentPeriodEnd: Instant,

    val daysBeforeExpiry: Int
)

data class SignatureCompletedRequest(
    @field:Email
    @field:NotBlank
    val email: String,

    @field:NotBlank
    val documentTitle: String
)

data class NotificationResponse(
    val success: Boolean,
    val message: String
)
