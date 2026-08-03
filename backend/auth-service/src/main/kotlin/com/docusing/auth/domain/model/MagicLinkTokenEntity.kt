package com.docusing.auth.domain.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "magic_link_tokens", indexes = [Index(columnList = "token", unique = true)])
class MagicLinkTokenEntity(
    @Id
    @GeneratedValue
    val id: UUID? = null,

    @Column(nullable = false, unique = true, length = 128)
    val token: String = "",

    @Column(nullable = false)
    val email: String = "",

    @Column(length = 255)
    val redirectPath: String? = null,

    @Column(nullable = false)
    val expiresAt: Instant = Instant.now(),

    @Column
    var consumedAt: Instant? = null,

    @Column
    var lastSentAt: Instant? = null,

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    val createdAt: Instant? = null
)
