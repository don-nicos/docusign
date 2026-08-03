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
import java.time.LocalDate
import java.util.UUID

@Entity
@Table(name = "users")
class UserEntity(
    @Id
    val id: UUID? = null,

    @Column(nullable = false, unique = true)
    val email: String = "",

    @Column(nullable = false)
    val fullName: String = "",

    // Hash de la contraseña (BCrypt). Puede ser null para usuarios con magic-link únicamente
    @Column(name = "password_hash")
    val passwordHash: String? = null,

    // Datos personales
    @Column(name = "rut", unique = true)
    val rut: String? = null,

    @Column(name = "first_name")
    val firstName: String? = null,

    @Column(name = "last_name")
    val lastName: String? = null,

    @Column(name = "second_last_name")
    val secondLastName: String? = null,

    @Column(name = "phone")
    val phone: String? = null,

    @Column(name = "address")
    val address: String? = null,

    @Column(name = "birth_date")
    val birthDate: LocalDate? = null,

    @Column(name = "default_organization_id")
    var defaultOrganizationId: UUID? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val status: UserStatus = UserStatus.ACTIVE,

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    val createdAt: Instant? = null,

    @UpdateTimestamp
    @Column(nullable = false)
    val updatedAt: Instant? = null
)

enum class UserStatus {
    ACTIVE,
    DISABLED
}
