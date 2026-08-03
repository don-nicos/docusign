package com.docusing.signature.common.dto.response

import java.time.Instant

data class SignatureRequestResponse(
    val id: String,
    val documentId: String,
    val ownerId: String,
    val title: String,
    val status: String,
    val expiresAt: Instant?,
    val completedAt: Instant?,
    val documentHash: String?,
    val signers: List<SignerResponse>,
    val pdfViewerWidth: Int?,
    val createdAt: Instant,
    val updatedAt: Instant?
)
