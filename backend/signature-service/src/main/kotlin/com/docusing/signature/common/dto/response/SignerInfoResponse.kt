package com.docusing.signature.common.dto.response

data class SignerInfoResponse(
    val signer: SignerResponse,
    val signatureRequest: SignatureRequestResponse,
    val documentUrl: String,
    val authenticated: Boolean
)
