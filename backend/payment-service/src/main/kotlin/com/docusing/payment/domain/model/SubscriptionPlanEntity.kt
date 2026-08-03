package com.docusing.payment.domain.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "subscription_plans")
class SubscriptionPlanEntity(
    @Id
    @GeneratedValue
    val id: UUID? = null,

    @Column(nullable = false, length = 32, unique = true)
    var planKey: String = "",

    @Column(nullable = false, length = 120)
    var name: String = "",

    @Column(nullable = false)
    var periodMonths: Int = 1,

    @Column(nullable = false)
    var netAmountClp: Int = 0,

    @Column(nullable = false, precision = 5, scale = 4)
    var discountRate: BigDecimal = BigDecimal("0.0000"),

    @Column(nullable = false)
    var active: Boolean = true,

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    val createdAt: Instant? = null,

    @UpdateTimestamp
    @Column(nullable = false)
    var updatedAt: Instant? = null
)
