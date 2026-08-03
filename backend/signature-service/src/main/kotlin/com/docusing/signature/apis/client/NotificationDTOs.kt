package com.docusing.signature.apis.client

data class MagicLinkEmailRequest(
    val email: String,
    val fullName: String? = null,
    val magicLinkUrl: String
)

data class SignatureCompletedRequest(
    val email: String,
    val documentTitle: String
)
