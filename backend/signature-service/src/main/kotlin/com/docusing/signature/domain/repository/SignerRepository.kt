package com.docusing.signature.domain.repository

import com.docusing.signature.domain.model.SignatureRequestStatus
import com.docusing.signature.domain.model.SignerEntity
import com.docusing.signature.domain.model.SignerStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID

@Repository
interface SignerRepository : JpaRepository<SignerEntity, UUID> {
    fun findByEmail(email: String): List<SignerEntity>
    fun findAllByStatus(status: SignerStatus): List<SignerEntity>
    fun existsByOtpCodeAndOtpExpiresAtAfter(otpCode: String, now: Instant): Boolean
    
    @Query(
        """
        SELECT s FROM SignerEntity s
        WHERE s.status = :status
        AND s.signatureRequest.status = :requestStatus
        AND (s.signatureRequest.expiresAt IS NULL OR s.signatureRequest.expiresAt > :now)
        AND s.signatureRequest.autoRemindersEnabled = true
        """
    )
    fun findPendingSignersForReminders(
        status: SignerStatus,
        requestStatus: SignatureRequestStatus,
        now: Instant
    ): List<SignerEntity>
}
