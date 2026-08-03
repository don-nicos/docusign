package com.docusing.auth.domain.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "organizations")
class OrganizationEntity(
    @Id
    @GeneratedValue
    val id: UUID? = null,

    @Column(nullable = false, length = 255)
    var name: String = "",

    @Column(name = "tax_id", length = 50)
    var taxId: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    var status: OrganizationStatus = OrganizationStatus.ACTIVE,

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    val createdAt: Instant? = null,

    @UpdateTimestamp
    @Column(nullable = false)
    var updatedAt: Instant? = null
)

enum class OrganizationStatus {
    ACTIVE,
    SUSPENDED,
    CANCELLED
}
