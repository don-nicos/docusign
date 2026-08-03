package com.docusing.signature.common.dto.response

import com.docusing.signature.domain.model.SignerStatus
import java.time.Instant

data class SignerResponse(
    val id: String,
    val email: String,
    val fullName: String,
    val orderIndex: Int,
    val status: SignerStatus,
    val signedAt: Instant?,
    val rejectionReason: String?,
    val signatureImagePath: String? = null,
    val positions: List<SignaturePositionResponse> = emptyList(),
    val signerIpAddress: String? = null,
    val authenticationMethod: String? = null,
    val signerUserAgent: String? = null
)
