package com.docusing.payment.domain.repository

import com.docusing.payment.domain.model.PricingConfigEntity
import com.docusing.payment.domain.model.SubscriptionChargeEntity
import com.docusing.payment.domain.model.SubscriptionEntity
import com.docusing.payment.domain.model.SubscriptionPlanEntity
import com.docusing.payment.domain.model.SubscriptionReminderEntity
import com.docusing.payment.domain.model.SubscriptionStatus
import com.docusing.payment.domain.model.WebhookEventEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID

@Repository
interface PricingConfigRepository : JpaRepository<PricingConfigEntity, UUID>

@Repository
interface SubscriptionPlanRepository : JpaRepository<SubscriptionPlanEntity, UUID> {
    fun findAllByActiveTrueOrderByPeriodMonthsAsc(): List<SubscriptionPlanEntity>
    fun findByPlanKey(planKey: String): SubscriptionPlanEntity?
}

@Repository
interface SubscriptionRepository : JpaRepository<SubscriptionEntity, UUID> {
    fun findFirstByUserIdOrderByCreatedAtDesc(userId: UUID): SubscriptionEntity?
    fun findByUserIdAndStatus(userId: UUID, status: SubscriptionStatus): List<SubscriptionEntity>
    fun findByStatusAndCurrentPeriodEndBetween(status: SubscriptionStatus, start: Instant, end: Instant): List<SubscriptionEntity>
}

@Repository
interface SubscriptionChargeRepository : JpaRepository<SubscriptionChargeEntity, UUID>

@Repository
interface WebhookEventRepository : JpaRepository<WebhookEventEntity, UUID>

@Repository
interface SubscriptionReminderRepository : JpaRepository<SubscriptionReminderEntity, UUID> {
    fun existsBySubscription_IdAndDaysBeforeExpiry(subscriptionId: UUID, daysBeforeExpiry: Int): Boolean
}
