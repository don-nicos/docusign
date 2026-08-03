package com.docusing.signature.core.exception

import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ResponseStatus

@ResponseStatus(HttpStatus.BAD_REQUEST)
class InvalidOtpException : RuntimeException("Invalid or expired OTP code")
