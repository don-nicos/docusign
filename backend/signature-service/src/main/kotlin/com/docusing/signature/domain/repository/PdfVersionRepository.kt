package com.docusing.signature.domain.repository

import com.docusing.signature.domain.model.PdfVersionEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface PdfVersionRepository : JpaRepository<PdfVersionEntity, UUID> {
    
    /**
     * Encuentra todas las versiones de una solicitud de firma, ordenadas por versión
     */
    fun findBySignatureRequestIdOrderByVersionNumberAsc(signatureRequestId: UUID): List<PdfVersionEntity>
    
    /**
     * Encuentra una versión específica de una solicitud
     */
    fun findBySignatureRequestIdAndVersionNumber(signatureRequestId: UUID, versionNumber: Int): PdfVersionEntity?
    
    /**
     * Encuentra la versión final de una solicitud
     */
    fun findBySignatureRequestIdAndIsFinalTrue(signatureRequestId: UUID): PdfVersionEntity?
    
    /**
     * Cuenta cuántas versiones tiene una solicitud
     */
    fun countBySignatureRequestId(signatureRequestId: UUID): Int

    /**
     * Verifica si existe una versión específica de una solicitud
     */
    fun existsBySignatureRequestIdAndVersionNumber(signatureRequestId: UUID, versionNumber: Int): Boolean
}
