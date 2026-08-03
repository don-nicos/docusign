package com.docusing.signature.core.job

import com.docusing.signature.config.SignatureProperties
import com.docusing.signature.core.service.SignatureService
import mu.KotlinLogging
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

private val logger = KotlinLogging.logger {}

@Component
class PdfOriginalBackfillJob(
    private val signatureService: SignatureService,
    private val signatureProperties: SignatureProperties
) {

    @Scheduled(fixedDelayString = "\${signature.backfill-fixed-delay-ms:600000}")
    @SchedulerLock(name = "signature-service.backfill-original-pdfs", lockAtLeastFor = "PT30S", lockAtMostFor = "PT5M")
    fun runBackfill() {
        if (!signatureProperties.backfillEnabled) {
            return
        }

        val batchSize = signatureProperties.backfillBatchSize
        val migrated = signatureService.backfillMissingOriginalVersions(batchSize)
        if (migrated > 0) {
            logger.info { "Original PDF backfill completed: $migrated requests updated" }
        } else {
            logger.debug { "Original PDF backfill: no pending requests" }
        }
    }
}
