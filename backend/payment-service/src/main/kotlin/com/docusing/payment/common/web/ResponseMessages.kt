package com.docusing.payment.common.web

object ResponseMessages {
    object Success {
        const val SUBSCRIPTION_CREATED = "Subscription created successfully"
        const val SUBSCRIPTION_CANCELLED = "Subscription cancelled successfully"
        const val PAYMENT_PROCESSED = "Payment processed successfully"
    }

    object Error {
        const val SUBSCRIPTION_NOT_FOUND = "Subscription not found"
        const val PAYMENT_FAILED = "Payment processing failed"
        const val INVALID_PLAN = "Invalid subscription plan"
    }
}
