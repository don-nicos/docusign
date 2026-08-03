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
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.OneToMany
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.Instant
import java.util.UUID
@Entity
@Table(
    name = "signers",
    indexes = [
        Index(columnList = "email"),
        Index(columnList = "status")
    ]
)
class SignerEntity(
    @Id
    @GeneratedValue
    val id: UUID? = null,

    @ManyToOne(optional = false)
    @JoinColumn(name = "signature_request_id", nullable = false)
    val signatureRequest: SignatureRequestEntity,

    @Column(nullable = false)
    val email: String = "",

    @Column(nullable = false, length = 120)
    val fullName: String = "",

    @Column(nullable = false)
    val orderIndex: Int = 0,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var status: SignerStatus = SignerStatus.PENDING,

    @Column(length = 16)
    var otpCode: String? = null,

    @Column
    var otpExpiresAt: Instant? = null,

    @Column
    var otpLastSentAt: Instant? = null,

    @Column
    var signedAt: Instant? = null,

    @Column(length = 500)
    var signatureImagePath: String? = null,

    // ========== CAMPOS LEGACY (DEPRECATED) ==========
    // Mantener por compatibilidad con datos antiguos
    // Usar signaturePositions en su lugar
    
    @Deprecated("Usar signaturePositions en su lugar")
    @Column(name = "signature_position_x")
    var signaturePositionX: Double? = null,

    @Deprecated("Usar signaturePositions en su lugar")
    @Column(name = "signature_position_y")
    var signaturePositionY: Double? = null,

    @Deprecated("Usar signaturePositions en su lugar")
    @Column(name = "signature_page")
    var signaturePage: Int? = null,

    @Deprecated("Usar signaturePositions en su lugar")
    @Column(name = "signature_width")
    var signatureWidth: Double? = null,

    @Deprecated("Usar signaturePositions en su lugar")
    @Column(name = "signature_height")
    var signatureHeight: Double? = null,
    
    // ========== FIN CAMPOS LEGACY ==========

    @Column(length = 255)
    var rejectionReason: String? = null,

    // Campos de auditoría para trazabilidad legal
    @Column(length = 64)
    var signerIpAddress: String? = null,

    @Column(length = 32)
    var authenticationMethod: String? = null, // "OTP", "MAGIC_LINK", etc.

    @Column(length = 500)
    var signerUserAgent: String? = null,
    
    // RUT chileno para validación de identidad
    @Column(length = 20)
    var rut: String? = null,
    
    @Column(name = "rut_verified")
    var rutVerified: Boolean = false,
    
    // Trace ID para trazabilidad (heredado de la solicitud)
    @Column(name = "trace_id", length = 36)
    var traceId: String? = null,
    
    // Token de acceso único para magic link (seguridad)
    @Column(name = "access_token", length = 64)
    var accessToken: String? = null,
    
    // Fecha de expiración del token de acceso
    @Column(name = "access_token_expires_at")
    var accessTokenExpiresAt: Instant? = null,
    
    // Relación con las posiciones de firma
    @OneToMany(mappedBy = "signer", cascade = [CascadeType.ALL], fetch = FetchType.EAGER, orphanRemoval = true)
    val signaturePositions: MutableList<SignaturePositionEntity> = mutableListOf(),

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    val createdAt: Instant? = null,

    @UpdateTimestamp
    @Column(nullable = false)
    val updatedAt: Instant? = null
)
