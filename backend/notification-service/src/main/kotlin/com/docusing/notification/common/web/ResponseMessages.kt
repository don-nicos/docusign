package com.docusing.notification.common.web

object ResponseMessages {
    object Success {
        const val EMAIL_SENT = "Email sent successfully"
        const val NOTIFICATION_QUEUED = "Notification queued successfully"
    }

    object Error {
        const val EMAIL_FAILED = "Failed to send email"
        const val INVALID_RECIPIENT = "Invalid recipient"
    }
}
