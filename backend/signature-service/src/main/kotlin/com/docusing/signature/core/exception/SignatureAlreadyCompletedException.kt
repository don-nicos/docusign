package com.docusing.signature.core.exception

import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ResponseStatus
import java.util.UUID

@ResponseStatus(HttpStatus.CONFLICT)
class SignatureAlreadyCompletedException(requestId: UUID) : 
    RuntimeException("Signature request $requestId is already completed")
