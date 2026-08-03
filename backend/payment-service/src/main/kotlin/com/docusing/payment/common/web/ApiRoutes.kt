package com.docusing.payment.common.web

object ApiRoutes {
    object Payments {
        const val BASE = "/api/payments"
        const val SUBSCRIPTIONS = "/subscriptions"
        const val SUBSCRIPTION_BY_USER = "/subscriptions/user/{userId}"
        const val SUBSCRIPTION_BY_ORG = "/subscriptions/organization/{organizationId}"
        const val PLANS = "/plans"
        const val WEBHOOK = "/webhook/mercadopago"
    }
}
