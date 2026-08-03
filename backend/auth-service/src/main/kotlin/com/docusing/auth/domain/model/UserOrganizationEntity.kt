package com.docusing.auth.domain.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "user_organizations")
class UserOrganizationEntity(
    @Id
    @GeneratedValue
    val id: UUID? = null,

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    val user: UserEntity,

    @ManyToOne(optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    val organization: OrganizationEntity,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    var role: OrganizationRole = OrganizationRole.MEMBER,

    @Column(name = "is_active", nullable = false)
    var isActive: Boolean = true,

    @CreationTimestamp
    @Column(name = "joined_at", nullable = false, updatable = false)
    val joinedAt: Instant? = null
)

enum class OrganizationRole {
    OWNER,
    ADMIN,
    MEMBER
}
