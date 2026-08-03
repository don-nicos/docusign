package com.docusing.auth.domain.repository

import com.docusing.auth.domain.model.MagicLinkTokenEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.Optional
import java.util.UUID

@Repository
interface MagicLinkTokenRepository : JpaRepository<MagicLinkTokenEntity, UUID> {
    fun findByToken(token: String): Optional<MagicLinkTokenEntity>

    fun findTopByEmailOrderByCreatedAtDesc(email: String): Optional<MagicLinkTokenEntity>

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update MagicLinkTokenEntity t set t.lastSentAt = ?2 where t.token = ?1")
    fun updateLastSentAt(token: String, lastSentAt: Instant)

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from MagicLinkTokenEntity t where t.expiresAt < ?1")
    fun deleteExpiredTokens(reference: Instant)
}
