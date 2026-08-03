package com.docusing.payment.domain.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "webhook_events")
class WebhookEventEntity(
    @Id
    @GeneratedValue
    val id: UUID? = null,

    @Column(nullable = false, length = 32)
    var provider: String = "MERCADOPAGO",

    @Column(length = 64)
    var topic: String? = null,

    @Column(name = "event_id", length = 120)
    var eventId: String? = null,

    @Column
    @JdbcTypeCode(SqlTypes.JSON)
    var payload: String? = null,

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    val receivedAt: Instant? = null,

    var processedAt: Instant? = null,

    @Column(nullable = false, length = 32)
    var status: String = "RECEIVED"
)
