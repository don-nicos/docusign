package com.docusing.auth.domain.repository

import com.docusing.auth.domain.model.RefreshTokenEntity
import com.docusing.auth.domain.model.UserEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.Optional
import java.util.UUID

@Repository
interface RefreshTokenRepository : JpaRepository<RefreshTokenEntity, UUID> {
    fun findByToken(token: String): Optional<RefreshTokenEntity>
    fun deleteAllByUserAndExpiresAtBefore(user: UserEntity, instant: Instant)
}
