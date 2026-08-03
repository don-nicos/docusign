package com.docusing.document.core.exception

import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ResponseStatus

@ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
class DocumentStorageException(message: String, cause: Throwable? = null) : 
    RuntimeException(message, cause)
