package com.docusing.auth.core.exception

import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ResponseStatus

@ResponseStatus(HttpStatus.BAD_REQUEST)
class MagicLinkInvalidTokenException : 
    RuntimeException("Invalid magic link token")
