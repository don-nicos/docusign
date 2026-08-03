package com.docusing.signature.infrastructure.logging

import com.fasterxml.jackson.databind.ObjectMapper
import mu.KotlinLogging
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Duration
import java.time.Instant
import java.util.UUID

private val logger = KotlinLogging.logger {}

@Service
class HttpIntegrationLogService(
    private val repository: HttpIntegrationLogRepository,
    private val objectMapper: ObjectMapper
) {
    
    @Transactional
    fun save(
        serviceName: String,
        method: String,
        url: String,
        requestHeaders: Map<String, String?>? = null,
        requestBody: String? = null,
        responseStatus: Int? = null,
        responseHeaders: Map<String, String?>? = null,
        responseBody: String? = null,
        duration: Duration? = null,
        errorMessage: String? = null
    ) {
        try {
            val traceId = com.docusing.signature.infrastructure.tracing.TraceIdInterceptor.getCurrentTraceId()
            
            val entity = HttpIntegrationLogEntity(
                id = UUID.randomUUID(),
                serviceName = serviceName,
                requestMethod = method,
                requestUrl = url,
                requestHeaders = requestHeaders?.let { objectMapper.writeValueAsString(it) },
                requestBody = requestBody,
                responseStatus = responseStatus,
                responseHeaders = responseHeaders?.let { objectMapper.writeValueAsString(it) },
                responseBody = responseBody,
                durationMs = duration?.toMillis(),
                errorMessage = errorMessage,
                traceId = traceId,
                createdAt = Instant.now()
            )
            
            repository.save(entity)
            logger.debug { "HTTP integration log saved: $method $url status=$responseStatus duration=${duration?.toMillis()}ms" }
        } catch (e: Exception) {
            logger.error(e) { "Error saving HTTP integration log for $method $url" }
        }
    }
}
