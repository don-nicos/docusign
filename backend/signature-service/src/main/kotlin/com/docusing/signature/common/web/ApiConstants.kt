package com.docusing.signature.common.web

object ApiHeaders {
    const val USER_ID = "X-User-Id"
    const val USER_EMAIL = "X-User-Email"

    const val TRACE_ID = "X-Trace-Id"
    const val B3_TRACE_ID = "X-B3-TraceId"

    const val DOCUMENT_HASH = "X-Document-Hash"
    const val SIGNATURES_COUNT = "X-Signatures-Count"
    const val IS_COMPLETE = "X-Is-Complete"
    const val VERSION_NUMBER = "X-Version-Number"
    const val IS_FINAL = "X-Is-Final"
}

object ApiErrorCodes {
    const val TOKEN_EXPIRED = "TOKEN_EXPIRED"
    const val INVALID_TOKEN = "INVALID_TOKEN"
}
