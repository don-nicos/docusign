package com.docusing.signature.common.dto.response

import java.time.Instant

/**
 * Datos de verificación pública de una solicitud de firma.
 * Se muestra al escanear el QR del certificado de auditoría.
 */
data class SignatureVerificationResponse(
    val requestId: String,
    val documentTitle: String,
    val status: String,
    val documentHash: String?,
    val completedAt: Instant?,
    val signers: List<SignerVerificationResponse>
)

/**
 * Datos de verificación de un firmante dentro de una solicitud.
 */
data class SignerVerificationResponse(
    val signerId: String,
    val fullName: String,
    val email: String,
    val status: String,
    val signedAt: Instant?,
    val authenticationMethod: String?,
    val ipAddress: String?
)
