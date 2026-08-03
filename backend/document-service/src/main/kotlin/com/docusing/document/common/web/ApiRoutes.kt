package com.docusing.document.common.web

object ApiRoutes {
    object Documents {
        const val BASE = "/api/documents"
        const val BY_ID = "/{documentId}"
        const val DOWNLOAD = "/{documentId}/download"
        const val LIST = ""
        const val COUNT = "/count"
        const val LOCK = "/{documentId}/lock"
        const val UPDATE_TITLE = "/{documentId}/title"
        const val UPDATE_FILE = "/{documentId}/file"
        const val UPLOAD_PDF = "/{documentId}/upload-pdf"
    }
}
