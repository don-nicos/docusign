package com.docusing.signature.domain.model

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.Instant
import java.util.UUID

@Entity
@Table(
    name = "pdf_versions",
    indexes = [
        Index(columnList = "signature_request_id"),
        Index(columnList = "version_number")
    ]
)
class PdfVersionEntity(
    @Id
    @GeneratedValue
    val id: UUID? = null,
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "signature_request_id", nullable = false)
    val signatureRequest: SignatureRequestEntity,
    
    @Column(name = "version_number", nullable = false)
    val versionNumber: Int = 0,
    
    @Column(name = "file_path", nullable = false, length = 500)
    val filePath: String,
    
    @Column(name = "document_hash", nullable = false, length = 64)
    val documentHash: String,
    
    @Column(name = "signed_by", length = 200)
    val signedBy: String? = null, // Nombre del firmante que generó esta versión
    
    @Column(name = "signer_id")
    val signerId: UUID? = null,
    
    @Column(name = "signatures_count", nullable = false)
    val signaturesCount: Int = 0,
    
    @Column(name = "total_signers", nullable = false)
    val totalSigners: Int = 0,
    
    @Column(name = "is_final", nullable = false)
    val isFinal: Boolean = false,
    
    @Column(name = "has_certificate", nullable = false)
    val hasCertificate: Boolean = false,
    
    @Column(name = "file_size_bytes", nullable = false)
    val fileSizeBytes: Long = 0,
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    val createdAt: Instant? = null
)
