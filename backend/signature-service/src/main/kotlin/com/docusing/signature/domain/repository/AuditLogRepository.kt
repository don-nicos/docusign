package com.docusing.signature.domain.repository

import com.docusing.signature.domain.model.AuditLogEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface AuditLogRepository : JpaRepository<AuditLogEntity, UUID>
