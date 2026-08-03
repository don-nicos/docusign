package com.docusing.signature.domain.repository

import com.docusing.signature.domain.model.SignatureRequestEntity
import com.docusing.signature.domain.model.SignatureRequestStatus
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface SignatureRequestRepository : JpaRepository<SignatureRequestEntity, UUID> {
    fun findAllByOwnerId(ownerId: UUID): List<SignatureRequestEntity>
    fun findAllByStatus(status: SignatureRequestStatus): List<SignatureRequestEntity>
    fun findAllByDocumentId(documentId: UUID): List<SignatureRequestEntity>

    @Query(
        """
        select sr
        from SignatureRequestEntity sr
        where sr.id is not null
          and not exists (
            select v.id from PdfVersionEntity v
            where v.signatureRequest = sr and v.versionNumber = 0
          )
        order by sr.createdAt asc
        """
    )
    fun findMissingOriginalVersion(pageable: Pageable): List<SignatureRequestEntity>
}
