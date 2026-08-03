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
@Table(name = "payment_pricing_config")
class PricingConfigEntity(
    @Id
    @GeneratedValue
    val id: UUID? = null,

    @Column(nullable = false, length = 8)
    var currency: String = "CLP",

    @Column(nullable = false, precision = 5, scale = 4)
    var ivaRate: BigDecimal = BigDecimal("0.1900"),

    @Column(nullable = false)
    var usdToClpRate: Int = 950,

    @Column(nullable = false, precision = 10, scale = 2)
    var monthlyBaseUsd: BigDecimal = BigDecimal("2.00"),

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    val createdAt: Instant? = null,

    @UpdateTimestamp
    @Column(nullable = false)
    var updatedAt: Instant? = null
)
