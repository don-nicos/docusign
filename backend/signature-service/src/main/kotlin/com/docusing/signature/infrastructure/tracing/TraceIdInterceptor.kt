package com.docusing.signature.infrastructure.tracing

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import mu.KotlinLogging
import org.slf4j.MDC
import org.springframework.stereotype.Component
import org.springframework.web.servlet.HandlerInterceptor
import java.util.*

private val logger = KotlinLogging.logger {}

/**
 * Interceptor para capturar y propagar el Trace ID en toda la petición.
 * 
 * El Trace ID puede venir de:
 * 1. Header X-Trace-Id (generado por el frontend)
 * 2. Header X-B3-TraceId (estándar de Zipkin/Brave)
 * 3. Se genera uno nuevo si no existe
 * 
 * El Trace ID se propaga mediante:
 * - MDC (Mapped Diagnostic Context) para logs
 * - ThreadLocal para acceso en servicios
 * - Response header para el cliente
 */
@Component
class TraceIdInterceptor : HandlerInterceptor {

    companion object {
        const val TRACE_ID_HEADER = "X-Trace-Id"
        const val B3_TRACE_ID_HEADER = "X-B3-TraceId"
        const val MDC_TRACE_ID_KEY = "traceId"
        
        private val traceIdThreadLocal = ThreadLocal<String>()
        
        /**
         * Obtiene el trace ID actual del contexto
         */
        fun getCurrentTraceId(): String? = traceIdThreadLocal.get()
        
        /**
         * Establece el trace ID en el contexto actual
         */
        fun setCurrentTraceId(traceId: String) {
            traceIdThreadLocal.set(traceId)
        }
        
        /**
         * Limpia el trace ID del contexto
         */
        fun clearTraceId() {
            traceIdThreadLocal.remove()
        }
    }

    override fun preHandle(
        request: HttpServletRequest,
        response: HttpServletResponse,
        handler: Any
    ): Boolean {
        // Intentar obtener trace ID de los headers
        val traceId = request.getHeader(TRACE_ID_HEADER)
            ?: request.getHeader(B3_TRACE_ID_HEADER)
            ?: generateTraceId()

        // Propagar en MDC para logs
        MDC.put(MDC_TRACE_ID_KEY, traceId)
        
        // Propagar en ThreadLocal para acceso en servicios
        setCurrentTraceId(traceId)
        
        // Agregar a response headers para el cliente
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
        // Limpiar contexto al finalizar la petición
        MDC.remove(MDC_TRACE_ID_KEY)
        clearTraceId()
    }

    private fun generateTraceId(): String {
        return UUID.randomUUID().toString()
    }
}
