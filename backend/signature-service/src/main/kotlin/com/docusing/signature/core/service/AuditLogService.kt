package com.docusing.signature.core.service

import com.docusing.signature.domain.model.AuditLogEntity
import com.docusing.signature.domain.repository.AuditLogRepository
import mu.KotlinLogging
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

private val logger = KotlinLogging.logger {}

@Service
class AuditLogService(
    private val auditLogRepository: AuditLogRepository
) {
    
    @Transactional
    fun log(
        entityType: String,
        entityId: UUID,
        action: String,
        actorId: UUID? = null,
        ip: String? = null,
        userAgent: String? = null,
        metadataJson: String? = null
    ) {
        // Capturar trace ID del contexto actual
        val traceId = com.docusing.signature.infrastructure.tracing.TraceIdInterceptor.getCurrentTraceId()
        
        val entry = AuditLogEntity(
            entityType = entityType,
            entityId = entityId,
            action = action,
            actorId = actorId,
            ip = ip,
            userAgent = userAgent,
            metadata = metadataJson,
            traceId = traceId
        )
        auditLogRepository.save(entry)
        logger.info { "Audit log: $entityType:$entityId action=$action actor=$actorId traceId=$traceId" }
    }
}
