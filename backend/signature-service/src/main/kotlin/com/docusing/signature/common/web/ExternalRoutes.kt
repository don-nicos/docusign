package com.docusing.signature.common.web

object ExternalRoutes {
    object Auth {
        const val GET_MY_ROLE = "/api/organizations/{organizationId}/my-role"
        const val GET_USER = "/api/users/{userId}"
    }

    object Documents {
        const val LOCK = "/api/documents/{documentId}/lock"
        const val GET = "/api/documents/{documentId}"
        const val DOWNLOAD = "/api/documents/{documentId}/download"
        const val COUNT = "/api/documents/count"
        const val UPLOAD_PDF = "/api/documents/{documentId}/file"
    }
}
