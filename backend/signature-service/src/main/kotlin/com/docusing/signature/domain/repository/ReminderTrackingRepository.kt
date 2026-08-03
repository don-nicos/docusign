package com.docusing.signature.domain.repository

import com.docusing.signature.domain.model.ReminderTrackingEntity
import com.docusing.signature.domain.model.SignerEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface ReminderTrackingRepository : JpaRepository<ReminderTrackingEntity, UUID> {
    fun findBySigner(signer: SignerEntity): ReminderTrackingEntity?
    fun findBySignerId(signerId: UUID): ReminderTrackingEntity?
}
