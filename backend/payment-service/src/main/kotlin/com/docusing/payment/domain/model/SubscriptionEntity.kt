package com.docusing.payment.domain.model

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
@Table(name = "subscriptions")
class SubscriptionEntity(
    @Id
    @GeneratedValue
    val id: UUID? = null,

    @Column(nullable = false)
    val userId: UUID = UUID(0, 0),

    @Column(name = "organization_id")
    var organizationId: UUID? = null,

    @Column(nullable = false, length = 32)
    var planKey: String = "",

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var provider: SubscriptionProvider = SubscriptionProvider.MOCK,

    @Column(length = 120)
    var providerSubscriptionId: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var status: SubscriptionStatus = SubscriptionStatus.PENDING,

    var startedAt: Instant? = null,

    var currentPeriodEnd: Instant? = null,

    @Column(nullable = false)
    var cancelAtPeriodEnd: Boolean = false,

    var cancelledAt: Instant? = null,

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    val createdAt: Instant? = null,

    @UpdateTimestamp
    @Column(nullable = false)
    var updatedAt: Instant? = null
)
