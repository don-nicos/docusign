package com.docusing.signature.apis.client

import com.docusing.signature.infrastructure.logging.HttpIntegrationLogService
import com.fasterxml.jackson.databind.ObjectMapper
import feign.Logger
import feign.Request
import feign.Response
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.io.IOException
import java.nio.charset.StandardCharsets
import java.time.Duration
import java.time.Instant

@Configuration
class FeignConfig(
    private val httpIntegrationLogService: HttpIntegrationLogService,
    private val objectMapper: ObjectMapper
) {

    @Bean
    fun feignLoggerLevel(): Logger.Level = Logger.Level.FULL

    @Bean
    fun feignLogger(): Logger = object : Logger() {
        private val requestStartTimes = ThreadLocal<Instant>()

        override fun logRequest(configKey: String, logLevel: Level, request: Request) {
            requestStartTimes.set(Instant.now())
        }

        override fun logRetry(configKey: String, logLevel: Level) {
            // No-op
        }

        override fun logAndRebufferResponse(
            configKey: String,
            logLevel: Level,
            response: Response,
            elapsedTime: Long
        ): Response {
            val startedAt = requestStartTimes.get() ?: Instant.now()
            requestStartTimes.remove()

            val duration = Duration.between(startedAt, Instant.now())
            val method = response.request().httpMethod().name
            val url = response.request().url()
            val reqHeaders = response.request().headers().mapValues { it.value.firstOrNull() }
            val respHeaders = response.headers().mapValues { it.value.firstOrNull() }
            val status = response.status()

            // Leer body de request si existe (simplificado para evitar consumir el stream)
            val reqBody: String? = null // No leemos el body de request para no consumir el stream

            // Leer body de response si existe
            val respBody = try {
                if (response.body() != null) {
                    val bodyData = response.body().asInputStream().readBytes()
                    
                    // Determinar si es contenido binario (PDF, imagen, etc.)
                    val contentType = response.headers()["content-type"]?.firstOrNull()?.lowercase() ?: ""
                    val isBinary = contentType.contains("pdf") || 
                                   contentType.contains("image") || 
                                   contentType.contains("octet-stream") ||
                                   bodyData.size > 10000 ||
                                   bodyData.any { it.toInt() == 0 } // Contiene null bytes
                    
                    val bodyStr = when {
                        isBinary -> "<binary data: ${bodyData.size} bytes, type: $contentType>"
                        else -> String(bodyData, StandardCharsets.UTF_8)
                    }
                    // Re-buffer para que el cliente pueda leerlo
                    val rebuffered = Response.builder()
                        .status(response.status())
                        .reason(response.reason())
                        .headers(response.headers())
                        .request(response.request())
                        .body(bodyData)
                        .build()
                    
                    // Guardar log con body
                    httpIntegrationLogService.save(
                        serviceName = "signature-service",
                        method = method,
                        url = url,
                        requestHeaders = reqHeaders,
                        requestBody = maskSensitiveData(reqBody),
                        responseStatus = status,
                        responseHeaders = respHeaders,
                        responseBody = bodyStr,
                        duration = duration,
                        errorMessage = null
                    )
                    return rebuffered
                } else {
                    null
                }
            } catch (e: IOException) {
                null
            }

            // Si no hay body o hubo error leyéndolo, guardar sin body
            httpIntegrationLogService.save(
                serviceName = "signature-service",
                method = method,
                url = url,
                requestHeaders = reqHeaders,
                requestBody = maskSensitiveData(reqBody),
                responseStatus = status,
                responseHeaders = respHeaders,
                responseBody = respBody,
                duration = duration,
                errorMessage = null
            )

            return response
        }

        override fun log(configKey: String, format: String, vararg args: Any?) {
            // No-op, usamos logAndRebufferResponse
        }

        override fun logIOException(
            configKey: String,
            logLevel: Level,
            ioe: IOException,
            elapsedTime: Long
        ): IOException {
            val startedAt = requestStartTimes.get() ?: Instant.now()
            requestStartTimes.remove()
            val duration = Duration.between(startedAt, Instant.now())

            httpIntegrationLogService.save(
                serviceName = "signature-service",
                method = "UNKNOWN",
                url = configKey,
                requestHeaders = null,
                requestBody = null,
                responseStatus = null,
                responseHeaders = null,
                responseBody = null,
                duration = duration,
                errorMessage = ioe.message
            )
            return ioe
        }

        private fun maskSensitiveData(body: String?): String? {
            if (body == null) return null
            return try {
                // Enmascarar OTP y otros datos sensibles
                body.replace(Regex("\"otp\"\\s*:\\s*\"[^\"]+\""), "\"otp\":\"***\"")
            } catch (e: Exception) {
                body
            }
        }
    }
}
