package com.docusing.auth.domain.repository

import com.docusing.auth.domain.model.OrganizationEntity
import com.docusing.auth.domain.model.OrganizationStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface OrganizationRepository : JpaRepository<OrganizationEntity, UUID> {
    fun findAllByStatus(status: OrganizationStatus): List<OrganizationEntity>
}
