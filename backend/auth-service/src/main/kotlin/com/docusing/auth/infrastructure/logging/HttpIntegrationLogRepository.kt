package com.docusing.auth.infrastructure.logging

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface HttpIntegrationLogRepository : JpaRepository<HttpIntegrationLogEntity, UUID>
