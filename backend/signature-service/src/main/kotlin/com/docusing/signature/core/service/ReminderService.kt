package com.docusing.signature.core.service

import com.docusing.signature.domain.model.ReminderTrackingEntity
import com.docusing.signature.domain.model.SignatureRequestStatus
import com.docusing.signature.domain.model.SignerEntity
import com.docusing.signature.domain.model.SignerStatus
import com.docusing.signature.domain.repository.ReminderTrackingRepository
import com.docusing.signature.domain.repository.SignatureRequestRepository
import com.docusing.signature.domain.repository.SignerRepository
import com.docusing.signature.apis.client.MagicLinkEmailRequest
import com.docusing.signature.apis.client.NotificationFeignClient
import com.docusing.signature.config.FrontendProperties
import com.docusing.signature.infrastructure.config.ReminderConfig
import mu.KotlinLogging
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.UUID

private val logger = KotlinLogging.logger {}

@Service
class ReminderService(
    private val signatureRequestRepository: SignatureRequestRepository,
    private val signerRepository: SignerRepository,
    private val reminderTrackingRepository: ReminderTrackingRepository,
    private val notificationFeignClient: NotificationFeignClient,
    private val frontendProperties: FrontendProperties,
    private val reminderConfig: ReminderConfig,
    private val clock: Clock
) {

    /**
     * Tarea programada que se ejecuta según configuración para enviar recordatorios
     * Usa ShedLock para evitar ejecución duplicada en múltiples pods
     */
    @Scheduled(cron = "\${signature.reminders.cron-expression}")
    @SchedulerLock(
        name = "sendScheduledReminders",
        lockAtMostFor = "9m",
        lockAtLeastFor = "1m"
    )
    @Transactional
    fun sendScheduledReminders() {
        if (!reminderConfig.enabled) {
            logger.debug { "Recordatorios automáticos deshabilitados" }
            return
        }

        logger.info { "Iniciando envío de recordatorios programados" }
        
        val now = Instant.now(clock)
        
        val pendingSigners = signerRepository.findPendingSignersForReminders(
            status = SignerStatus.PENDING,
            requestStatus = SignatureRequestStatus.IN_PROGRESS,
            now = now
        )

        logger.info { "Encontrados ${pendingSigners.size} firmantes pendientes" }

        var remindersSent = 0
        
        pendingSigners.forEach { signer ->
            if (shouldSendReminderToSigner(signer, now)) {
                try {
                    sendReminderToSigner(signer)
                    remindersSent++
                } catch (e: Exception) {
                    logger.error(e) { "Error enviando recordatorio a firmante ${signer.id}" }
                }
            }
        }

        logger.info { "Recordatorios enviados: $remindersSent" }
    }

    /**
     * Determina si se debe enviar un recordatorio a un firmante
     */
    private fun shouldSendReminderToSigner(signer: SignerEntity, now: Instant): Boolean {
        val tracking = reminderTrackingRepository.findBySigner(signer)
        
        // Verificar si ya se alcanzó el máximo de recordatorios
        if (tracking != null && tracking.reminderCount >= reminderConfig.maxReminders) {
            return false
        }

        val createdAt = signer.createdAt ?: return false

        return if (tracking == null || tracking.lastReminderSentAt == null) {
            // Primer recordatorio: después de N días de creado
            val daysSinceCreated = Duration.between(createdAt, now).toDays()
            daysSinceCreated >= reminderConfig.daysBeforeFirstReminder
        } else {
            // Recordatorios subsecuentes: cada N días
            val daysSinceLastReminder = Duration.between(tracking.lastReminderSentAt, now).toDays()
            daysSinceLastReminder >= reminderConfig.daysBetweenReminders
        }
    }

    /**
     * Envía un recordatorio a un firmante específico
     */
    @Transactional
    fun sendReminderToSigner(signer: SignerEntity) {
        val magicLinkUrl = "${frontendProperties.baseUrl}/sign/${signer.id}"
        
        notificationFeignClient.sendMagicLinkEmail(
            MagicLinkEmailRequest(
                email = signer.email,
                fullName = signer.fullName,
                magicLinkUrl = magicLinkUrl
            )
        )
        
        // Actualizar o crear tracking
        val tracking = reminderTrackingRepository.findBySigner(signer) ?: ReminderTrackingEntity(
            signer = signer,
            reminderCount = 0
        )
        
        tracking.reminderCount += 1
        tracking.lastReminderSentAt = Instant.now(clock)
        reminderTrackingRepository.save(tracking)
        
        logger.info { "Recordatorio #${tracking.reminderCount} enviado a ${signer.email} (firmante ${signer.id})" }
    }

    /**
     * Envía recordatorios a todos los firmantes pendientes de una solicitud
     */
    @Transactional
    fun sendRemindersForRequest(request: com.docusing.signature.domain.model.SignatureRequestEntity) {
        val pendingSigners = request.signers.filter { it.status == SignerStatus.PENDING }
        
        if (pendingSigners.isEmpty()) {
            logger.info { "No hay firmantes pendientes en solicitud ${request.id}" }
            return
        }

        logger.info { "Enviando recordatorios a ${pendingSigners.size} firmantes de solicitud ${request.id}" }

        pendingSigners.forEach { signer ->
            try {
                sendReminderToSigner(signer)
            } catch (e: Exception) {
                logger.error(e) { "Error enviando recordatorio a ${signer.email}" }
            }
        }

        logger.info { "Recordatorios enviados a todos los firmantes pendientes de solicitud ${request.id}" }
    }

    /**
     * Reenvía el magic link a un firmante específico
     */
    @Transactional
    fun resendMagicLink(signerId: UUID) {
        logger.debug { "Resending magic link to signer $signerId" }
        
        val signer = signerRepository.findById(signerId)
            .orElseThrow { IllegalArgumentException("Signer not found") }

        if (signer.status != SignerStatus.PENDING) {
            logger.warn { "Attempted to resend magic link to non-pending signer $signerId with status ${signer.status}" }
            throw IllegalStateException("Magic link can only be resent to pending signers")
        }

        sendReminderToSigner(signer)
        logger.info { "Magic link resent to ${signer.email}" }
    }

    /**
     * Envía un recordatorio manual para una solicitud específica
     */
    @Transactional
    fun sendManualReminder(requestId: java.util.UUID) {
        logger.debug { "Sending manual reminder for request $requestId" }
        
        val request = signatureRequestRepository.findById(requestId)
            .orElseThrow { IllegalArgumentException("Signature request not found") }

        if (request.status != SignatureRequestStatus.IN_PROGRESS) {
            logger.warn { "Attempted to send reminder for request $requestId with status ${request.status}" }
            throw IllegalStateException("Reminders can only be sent for in-progress requests")
        }

        sendRemindersForRequest(request)
        logger.info { "Manual reminder sent for request $requestId" }
    }

    /**
     * Desactiva los recordatorios automáticos para una solicitud
     */
    @Transactional
    fun disableAutoReminders(requestId: java.util.UUID) {
        logger.debug { "Disabling auto reminders for request $requestId" }
        
        val request = signatureRequestRepository.findById(requestId)
            .orElseThrow { IllegalArgumentException("Signature request not found") }

        request.autoRemindersEnabled = false
        signatureRequestRepository.save(request)
        logger.info { "Auto reminders disabled for request $requestId" }
    }

    /**
     * Activa los recordatorios automáticos para una solicitud
     */
    @Transactional
    fun enableAutoReminders(requestId: java.util.UUID) {
        logger.debug { "Enabling auto reminders for request $requestId" }
        
        val request = signatureRequestRepository.findById(requestId)
            .orElseThrow { IllegalArgumentException("Signature request not found") }

        request.autoRemindersEnabled = true
        signatureRequestRepository.save(request)
        logger.info { "Auto reminders enabled for request $requestId" }
    }
}
