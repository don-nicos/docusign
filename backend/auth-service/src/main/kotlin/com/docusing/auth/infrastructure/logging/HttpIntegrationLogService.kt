package com.docusing.auth.infrastructure.logging

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Service
import java.time.Duration
import java.time.Instant
import java.util.UUID

@Service
class HttpIntegrationLogService(
    private val repository: HttpIntegrationLogRepository,
    private val objectMapper: ObjectMapper
) {
    fun save(
        serviceName: String,
        method: String,
        url: String,
        requestHeaders: Map<String, String?>?,
        requestBody: String?,
        responseStatus: Int?,
        responseHeaders: Map<String, String?>?,
        responseBody: String?,
        duration: Duration?,
        errorMessage: String?
    ) {
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
            createdAt = Instant.now()
        )
        repository.save(entity)
    }
}
