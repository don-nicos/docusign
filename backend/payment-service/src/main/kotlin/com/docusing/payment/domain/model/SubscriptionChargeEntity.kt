package com.docusing.payment.domain.model

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
@Table(name = "subscription_charges")
class SubscriptionChargeEntity(
    @Id
    @GeneratedValue
    val id: UUID? = null,

    @ManyToOne(optional = false)
    @JoinColumn(name = "subscription_id", nullable = false)
    val subscription: SubscriptionEntity = SubscriptionEntity(),

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var provider: SubscriptionProvider = SubscriptionProvider.MOCK,

    @Column(length = 120)
    var providerPaymentId: String? = null,

    @Column(nullable = false, length = 8)
    var currency: String = "CLP",

    @Column(nullable = false)
    var amountNetClp: Int = 0,

    @Column(nullable = false)
    var amountTaxClp: Int = 0,

    @Column(nullable = false)
    var amountGrossClp: Int = 0,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var status: ChargeStatus = ChargeStatus.PAID,

    var paidAt: Instant? = null,

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    val createdAt: Instant? = null
)
