package com.docusing.document.domain.repository

import com.docusing.document.domain.model.DocumentEntity
import com.docusing.document.domain.model.DocumentStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface DocumentRepository : JpaRepository<DocumentEntity, UUID> {
    fun findAllByOwnerId(ownerId: UUID): List<DocumentEntity>
    fun findAllByOrganizationId(organizationId: UUID): List<DocumentEntity>
    fun findAllByStatus(status: DocumentStatus): List<DocumentEntity>
    fun countByOwnerId(ownerId: UUID): Long
}
