package com.docusing.auth.core.exception

import java.time.Instant
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ResponseStatus

@ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
class MagicLinkThrottleException(val resendAvailableAt: Instant) : 
    RuntimeException("Magic link requested recently")
