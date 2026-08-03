package com.docusing.signature.domain.model

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.Instant
import java.util.UUID

@Entity
@Table(
    name = "reminder_tracking",
    indexes = [
        Index(name = "idx_reminder_tracking_signer_id", columnList = "signer_id"),
        Index(name = "idx_reminder_tracking_last_sent", columnList = "last_reminder_sent_at")
    ]
)
class ReminderTrackingEntity(
    @Id
    @GeneratedValue
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "signer_id", nullable = false)
    val signer: SignerEntity,

    @Column(name = "reminder_count", nullable = false)
    var reminderCount: Int = 0,

    @Column(name = "last_reminder_sent_at")
    var lastReminderSentAt: Instant? = null,

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant? = null,

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant? = null
)
