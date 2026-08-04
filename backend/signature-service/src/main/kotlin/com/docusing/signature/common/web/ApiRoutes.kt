package com.docusing.signature.common.web

object ApiRoutes {
    const val API_BASE = "/api"

    object Signatures {
        const val BASE = "$API_BASE/signatures"
        const val CREATE = ""
        const val LIST = ""
        const val BY_ID = "/{requestId}"
        const val BY_DOCUMENT = "/document/{documentId}"

        object Signer {
            const val MY_REQUESTS = "/signer/my-requests"
            const val SIGN = "/signer/{signerId}/sign"
            const val REJECT = "/signer/{signerId}/reject"
            const val UPLOAD_SIGNATURE = "/signer/{signerId}/upload-signature"
            const val REQUEST_OTP = "/signer/{signerId}/request-otp"
            const val INFO = "/signer/{signerId}/info"
            const val USER_SIGNATURES = "/signer/{signerId}/user-signatures"
            const val SAVE_USER_SIGNATURE = "/signer/{signerId}/save-user-signature"
        }

        const val DOWNLOAD_SIGNED = "/{requestId}/download-signed"
        const val REGENERATE_MAGIC_LINK = "/{requestId}/regenerate-magic-link/{signerId}"
        const val SIGNATURE_IMAGES = "/images/{*filename}"
        const val VERIFY = "/verify/{requestId}"

        object Versions {
            const val LIST = "/{requestId}/versions"
            const val DOWNLOAD = "/{requestId}/versions/{versionNumber}/download"
        }

        object Reminders {
            const val SEND_MANUAL = "/{requestId}/send-reminder"
            const val RESEND_MAGIC_LINK = "/signer/{signerId}/resend-magic-link"
            const val ENABLE_AUTO = "/{requestId}/reminders/enable"
            const val DISABLE_AUTO = "/{requestId}/reminders/disable"
        }

        const val VALIDATE_RUT = "/validate-rut"
        const val DETECT_FIELDS = "/detect-fields/{documentId}"
    }

    object UserSignatures {
        const val BASE = "$API_BASE/user-signatures"
        const val LIST = ""
        const val CREATE = ""
        const val DELETE = "/{signatureId}"
        const val SET_DEFAULT = "/{signatureId}/set-default"
    }
}
