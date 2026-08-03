package com.docusing.document.domain.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.Instant
import java.util.UUID

@Entity
@Table(
    name = "documents",
    indexes = [Index(columnList = "ownerId"), Index(columnList = "status")]
)
class DocumentEntity(
    @Id
    @GeneratedValue
    val id: UUID? = null,

    @Column(nullable = false)
    val ownerId: UUID = UUID(0, 0),

    @Column(nullable = false, length = 180)
    var title: String = "",

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var status: DocumentStatus = DocumentStatus.DRAFT,

    @Column(nullable = false, length = 255)
    val originalFilename: String = "",

    @Column(nullable = false, length = 512)
    var storageKey: String = "",

    @Column(nullable = false)
    var fileSize: Long = 0,

    @Column(length = 255)
    var contentType: String? = null,

    @Column(nullable = false, length = 64)
    var hashSha256: String = "",
    
    @Column(name = "trace_id", length = 36)
    var traceId: String? = null,

    @Column(name = "organization_id")
    var organizationId: UUID? = null,

    @Column(name = "is_organization_document", nullable = false)
    var isOrganizationDocument: Boolean = false,

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    val createdAt: Instant? = null,

    @UpdateTimestamp
    @Column(nullable = false)
    var updatedAt: Instant? = null
)
