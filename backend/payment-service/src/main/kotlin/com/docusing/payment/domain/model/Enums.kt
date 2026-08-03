package com.docusing.payment.domain.model

enum class SubscriptionProvider {
    MERCADOPAGO,
    MOCK
}

enum class SubscriptionStatus {
    PENDING,
    ACTIVE,
    CANCELLED,
    EXPIRED
}

enum class ChargeStatus {
    PENDING,
    PAID,
    FAILED
}
