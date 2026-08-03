package com.docusing.document.core.exception

import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ResponseStatus
import java.util.UUID

@ResponseStatus(HttpStatus.NOT_FOUND)
class DocumentNotFoundException(documentId: UUID) : 
    RuntimeException("Document $documentId not found")
