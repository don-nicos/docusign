package com.docusing.document.common.web

object ResponseMessages {
    object Success {
        const val DOCUMENT_UPLOADED = "Document uploaded successfully"
        const val DOCUMENT_DELETED = "Document deleted successfully"
        const val DOCUMENT_LOCKED = "Document locked successfully"
        const val TITLE_UPDATED = "Document title updated successfully"
        const val PDF_UPLOADED = "PDF uploaded successfully"
    }

    object Error {
        const val DOCUMENT_NOT_FOUND = "Document not found"
        const val UNAUTHORIZED = "Unauthorized access"
        const val DOCUMENT_LOCKED = "Document is locked"
        const val INVALID_FILE = "Invalid file format"
        const val FILE_TOO_LARGE = "File size exceeds maximum allowed"
        const val STORAGE_ERROR = "Error storing document"
    }
}
