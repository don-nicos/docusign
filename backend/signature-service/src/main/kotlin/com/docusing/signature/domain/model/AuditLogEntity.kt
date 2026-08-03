package com.docusing.signature.domain.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant
import java.util.UUID

@Entity
@Table(
    name = "audit_logs",
    indexes = [
        Index(name = "idx_audit_logs_entity", columnList = "entity_type,entity_id"),
        Index(name = "idx_audit_logs_action", columnList = "action"),
        Index(name = "idx_audit_logs_created_at", columnList = "created_at"),
        Index(name = "idx_audit_logs_trace_id", columnList = "trace_id")
    ]
)
class AuditLogEntity(
    @Column(name = "entity_type", length = 64, nullable = false)
    var entityType: String,

    @Column(name = "entity_id", nullable = false)
    var entityId: UUID,

    @Column(name = "action", length = 64, nullable = false)
    var action: String,

    @Column(name = "actor_id")
    var actorId: UUID? = null,

    @Column(name = "ip", length = 64)
    var ip: String? = null,

    @Column(name = "user_agent", length = 512)
    var userAgent: String? = null,

    // Guardamos JSON como texto; la columna es jsonb en DB
    @Column(name = "metadata")
    @JdbcTypeCode(SqlTypes.JSON)
    var metadata: String? = null,
    
    // Trace ID para trazabilidad end-to-end
    @Column(name = "trace_id", length = 36)
    var traceId: String? = null,

    @Id
    @GeneratedValue
    var id: UUID? = null,

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant? = null
)
