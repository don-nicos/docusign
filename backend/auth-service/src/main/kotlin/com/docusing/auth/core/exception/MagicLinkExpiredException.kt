package com.docusing.auth.core.exception

import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ResponseStatus

@ResponseStatus(HttpStatus.GONE)
class MagicLinkExpiredException : 
    RuntimeException("Magic link token has expired")
