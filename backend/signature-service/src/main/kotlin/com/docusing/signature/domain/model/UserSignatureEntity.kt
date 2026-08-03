package com.docusing.signature.domain.model

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.Instant
import java.util.UUID

@Entity
@Table(
    name = "user_signatures",
    indexes = [
        Index(name = "idx_user_signatures_user_id", columnList = "user_id"),
        Index(name = "idx_user_signatures_created_at", columnList = "created_at")
    ]
)
class UserSignatureEntity(
    @Id
    @GeneratedValue
    var id: UUID? = null,

    @Column(name = "user_id", nullable = false)
    var userId: UUID,

    @Column(name = "signature_image_path", nullable = false, length = 500)
    var signatureImagePath: String,

    @Column(name = "name", length = 100)
    var name: String? = null, // Nombre opcional para la firma (ej: "Firma formal", "Firma rápida")

    @Column(name = "is_default")
    var isDefault: Boolean = false, // Si es la firma por defecto del usuario

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant? = null,

    @UpdateTimestamp
    @Column(name = "updated_at")
    var updatedAt: Instant? = null
)
