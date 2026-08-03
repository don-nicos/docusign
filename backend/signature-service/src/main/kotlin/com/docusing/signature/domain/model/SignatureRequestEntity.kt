package com.docusing.signature.domain.model

import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.OneToMany
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.Instant
import java.util.UUID

@Entity
@Table(
    name = "signature_requests",
    indexes = [
        Index(columnList = "documentId"),
        Index(columnList = "ownerId"),
        Index(columnList = "status")
    ]
)
class SignatureRequestEntity(
    @Id
    @GeneratedValue
    val id: UUID? = null,

    @Column(nullable = false)
    val documentId: UUID = UUID(0, 0),

    @Column(nullable = false)
    val ownerId: UUID = UUID(0, 0),

    @Column(nullable = false, length = 200)
    var title: String = "",

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var status: SignatureRequestStatus = SignatureRequestStatus.PENDING,

    @Column
    var expiresAt: Instant? = null,

    @Column
    var completedAt: Instant? = null,
    
    @Column(length = 64)
    var documentHash: String? = null,
    
    // Ruta del PDF firmado final (se genera al completar todas las firmas)
    @Column(name = "signed_pdf_path", length = 500)
    var signedPdfPath: String? = null,
    
    // Ancho del PDF usado al crear las posiciones de firma (en píxeles)
    // Permite mantener las posiciones correctas al visualizar
    @Column(name = "pdf_viewer_width")
    var pdfViewerWidth: Int? = null,
    
    // Trace ID para trazabilidad end-to-end (generado en frontend)
    @Column(name = "trace_id", length = 36)
    var traceId: String? = null,

    @Column(name = "organization_id")
    var organizationId: UUID? = null,

    @Column(name = "is_organization_request", nullable = false)
    var isOrganizationRequest: Boolean = false,
    
    // Días de validez del magic link (customizable, default 7)
    @Column(name = "magic_link_expiration_days", nullable = false)
    var magicLinkExpirationDays: Int = 7,

    @OneToMany(mappedBy = "signatureRequest", cascade = [CascadeType.ALL], fetch = FetchType.EAGER, orphanRemoval = true)
    val signers: MutableList<SignerEntity> = mutableListOf(),

    // Campos para recordatorios automáticos
    @Column(name = "last_reminder_sent_at")
    var lastReminderSentAt: Instant? = null,
    
    @Column(name = "reminder_count")
    var reminderCount: Int = 0,
    
    @Column(name = "auto_reminders_enabled")
    var autoRemindersEnabled: Boolean = true,
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    val createdAt: Instant? = null,
    
    @UpdateTimestamp
    @Column(nullable = false)
    val updatedAt: Instant? = null
)
