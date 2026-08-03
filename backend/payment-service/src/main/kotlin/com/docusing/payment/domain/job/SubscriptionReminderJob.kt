package com.docusing.payment.domain.job

import com.docusing.payment.config.PaymentReminderProperties
import com.docusing.payment.domain.model.SubscriptionStatus
import com.docusing.payment.domain.model.SubscriptionReminderEntity
import com.docusing.payment.domain.repository.SubscriptionPlanRepository
import com.docusing.payment.domain.repository.SubscriptionReminderRepository
import com.docusing.payment.domain.repository.SubscriptionRepository
import com.docusing.payment.infrastructure.client.AuthFeignClient
import com.docusing.payment.infrastructure.client.NotificationFeignClient
import mu.KotlinLogging
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

private val logger = KotlinLogging.logger {}

@Component
class SubscriptionReminderJob(
    private val reminderProperties: PaymentReminderProperties,
    private val subscriptionRepository: SubscriptionRepository,
    private val subscriptionReminderRepository: SubscriptionReminderRepository,
    private val subscriptionPlanRepository: SubscriptionPlanRepository,
    private val authFeignClient: AuthFeignClient,
    private val notificationFeignClient: NotificationFeignClient,
    private val clock: Clock
) {

    @Scheduled(cron = "0 0 9 * * ?")
    @Transactional
    fun run() {
        if (!reminderProperties.enabled) return

        val now = Instant.now(clock)
        val zone = ZoneOffset.UTC

        reminderProperties.daysBeforeExpiry
            .distinct()
            .sortedDescending()
            .forEach { daysBefore ->
                val targetDate = LocalDate.now(zone).plusDays(daysBefore.toLong())
                val start = targetDate.atStartOfDay(zone).toInstant()
                val end = targetDate.plusDays(1).atStartOfDay(zone).toInstant().minusMillis(1)

                val candidates = subscriptionRepository.findByStatusAndCurrentPeriodEndBetween(
                    status = SubscriptionStatus.ACTIVE,
                    start = start,
                    end = end
                )

                if (candidates.isEmpty()) return@forEach

                logger.info { "Recordatorios: ${candidates.size} suscripciones vencen en $daysBefore día(s)" }

                candidates.forEach { sub ->
                    val subId = sub.id ?: return@forEach
                    val periodEnd = sub.currentPeriodEnd ?: return@forEach

                    if (periodEnd.isBefore(now)) return@forEach

                    val alreadySent = subscriptionReminderRepository.existsBySubscription_IdAndDaysBeforeExpiry(
                        subscriptionId = subId,
                        daysBeforeExpiry = daysBefore
                    )
                    if (alreadySent) return@forEach

                    val user = runCatching { authFeignClient.getUserById(sub.userId) }.getOrNull()
                        ?: return@forEach

                    val planName = subscriptionPlanRepository.findByPlanKey(sub.planKey)?.name ?: sub.planKey

                    runCatching {
                        notificationFeignClient.sendSubscriptionExpiring(
                            request = com.docusing.payment.infrastructure.client.SubscriptionExpiringEmailRequest(
                                email = user.email,
                                fullName = user.fullName,
                                planName = planName,
                                currentPeriodEnd = periodEnd,
                                daysBeforeExpiry = daysBefore
                            )
                        )
                    }.onFailure { ex ->
                        logger.warn(ex) { "No se pudo enviar recordatorio de suscripción para usuario ${sub.userId}" }
                        return@forEach
                    }

                    subscriptionReminderRepository.save(
                        SubscriptionReminderEntity(
                            subscription = sub,
                            daysBeforeExpiry = daysBefore
                        )
                    )

                    logger.info { "Recordatorio enviado usuario ${sub.userId} ($daysBefore día(s) antes)" }
                }
            }
    }
}
