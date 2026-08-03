package com.docusing.signature.core.exception

import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ResponseStatus
import java.util.UUID

@ResponseStatus(HttpStatus.NOT_FOUND)
class SignerNotFoundException(signerId: UUID) : 
    RuntimeException("Signer $signerId not found")
