package com.docusing.signature.common.web

object ResponseMessages {
    object Success {
        const val SIGNATURE_CREATED = "Signature request created successfully"
        const val DOCUMENT_SIGNED = "Document signed successfully"
        const val DOCUMENT_REJECTED = "Document rejected successfully"
        const val SIGNATURE_REJECTED = "Signature rejected successfully"
        const val SIGNATURE_UPLOADED = "Signature uploaded successfully"
        const val MAGIC_LINK_REGENERATED = "Magic link regenerated successfully"
        const val REMINDER_SENT = "Reminder sent successfully"
        const val MAGIC_LINK_SENT = "Magic link sent successfully"
        const val SIGNATURE_SAVED = "Signature saved successfully"
        const val SIGNATURE_DELETED = "Signature deleted successfully"
        const val SIGNATURE_SET_DEFAULT = "Signature set as default"
    }

    object Error {
        const val SIGNATURE_NOT_FOUND = "Signature request not found"
        const val SIGNER_NOT_FOUND = "Signer not found"
        const val INVALID_TOKEN = "Invalid or expired token"
        const val TOKEN_EXPIRED = "Token has expired"
        const val UNAUTHORIZED = "Unauthorized access"
        const val DOCUMENT_LOCKED = "Document is locked by another process"
        const val SIGNATURE_EXPIRED = "Signature request has expired"
        const val SIGNATURE_COMPLETED = "Signature request is already completed"
        const val NOT_YOUR_TURN = "Not your turn to sign"
        const val INVALID_OTP = "Invalid or expired OTP code"
        const val SUBSCRIPTION_REQUIRED = "Active subscription required"
        const val DOCUMENT_LIMIT_REACHED = "Document limit reached for your plan"
        const val INVALID_RUT = "Invalid RUT format"
        const val PDF_PROCESSING_ERROR = "Error processing PDF document"
    }

    object Validation {
        const val REQUIRED_FIELD = "This field is required"
        const val INVALID_EMAIL = "Invalid email format"
        const val INVALID_UUID = "Invalid UUID format"
        const val MIN_VALUE = "Value must be at least %d"
        const val MAX_VALUE = "Value must be at most %d"
    }
}
