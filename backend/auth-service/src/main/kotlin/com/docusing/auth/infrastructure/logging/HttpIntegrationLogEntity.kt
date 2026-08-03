package com.docusing.auth.infrastructure.logging

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "http_integration_logs")
class HttpIntegrationLogEntity(
    @Id
    val id: UUID,

    @Column(name = "service_name", nullable = false, length = 64)
    val serviceName: String,

    @Column(name = "request_method", nullable = false, length = 16)
    val requestMethod: String,

    @Column(name = "request_url", nullable = false, columnDefinition = "TEXT")
    val requestUrl: String,

    @Column(name = "request_headers")
    @JdbcTypeCode(SqlTypes.JSON)
    val requestHeaders: String?,

    @Column(name = "request_body", columnDefinition = "TEXT")
    val requestBody: String?,

    @Column(name = "response_status")
    val responseStatus: Int?,

    @Column(name = "response_headers")
    @JdbcTypeCode(SqlTypes.JSON)
    val responseHeaders: String?,

    @Column(name = "response_body", columnDefinition = "TEXT")
    val responseBody: String?,

    @Column(name = "duration_ms")
    val durationMs: Long?,

    @Column(name = "error_message", columnDefinition = "TEXT")
    val errorMessage: String?,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant
)
