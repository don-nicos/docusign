package com.docusing.signature.common.dto.request

// OTP DESACTIVADO - Validación eliminada para permitir strings vacíos
data class SignDocumentRequest(
    val otp: String? = ""
)
