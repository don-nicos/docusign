package com.docusing.payment.domain.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "subscription_reminders")
class SubscriptionReminderEntity(
    @Id
    @GeneratedValue
    val id: UUID? = null,

    @ManyToOne(optional = false)
    @JoinColumn(name = "subscription_id", nullable = false)
    val subscription: SubscriptionEntity = SubscriptionEntity(),

    @Column(nullable = false)
    val daysBeforeExpiry: Int = 0,

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    val sentAt: Instant? = null
)
