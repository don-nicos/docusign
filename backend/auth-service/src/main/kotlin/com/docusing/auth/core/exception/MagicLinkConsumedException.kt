package com.docusing.auth.core.exception

import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ResponseStatus

@ResponseStatus(HttpStatus.BAD_REQUEST)
class MagicLinkConsumedException : 
    RuntimeException("Magic link token has already been used")
