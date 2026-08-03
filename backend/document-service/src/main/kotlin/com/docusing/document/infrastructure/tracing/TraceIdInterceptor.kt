package com.docusing.document.infrastructure.tracing

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import mu.KotlinLogging
import org.slf4j.MDC
import org.springframework.stereotype.Component
import org.springframework.web.servlet.HandlerInterceptor
import java.util.*

private val logger = KotlinLogging.logger {}

@Component
class TraceIdInterceptor : HandlerInterceptor {

    companion object {
        const val TRACE_ID_HEADER = "X-Trace-Id"
        const val B3_TRACE_ID_HEADER = "X-B3-TraceId"
        const val MDC_TRACE_ID_KEY = "traceId"
        
        private val traceIdThreadLocal = ThreadLocal<String>()
        
        fun getCurrentTraceId(): String? = traceIdThreadLocal.get()
        
        fun setCurrentTraceId(traceId: String) {
            traceIdThreadLocal.set(traceId)
        }
        
        fun clearTraceId() {
            traceIdThreadLocal.remove()
        }
    }

    override fun preHandle(
        request: HttpServletRequest,
        response: HttpServletResponse,
        handler: Any
    ): Boolean {
        val traceId = request.getHeader(TRACE_ID_HEADER)
            ?: request.getHeader(B3_TRACE_ID_HEADER)
            ?: generateTraceId()

        MDC.put(MDC_TRACE_ID_KEY, traceId)
        setCurrentTraceId(traceId)
        response.setHeader(TRACE_ID_HEADER, traceId)
        
        logger.debug { "Trace ID establecido: $traceId para ${request.method} ${request.requestURI}" }
        
        return true
    }

    override fun afterCompletion(
        request: HttpServletRequest,
        response: HttpServletResponse,
        handler: Any,
        ex: Exception?
    ) {
        MDC.remove(MDC_TRACE_ID_KEY)
        clearTraceId()
    }

    private fun generateTraceId(): String {
        return UUID.randomUUID().toString()
    }
}
