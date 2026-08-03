package com.docusing.signature.domain.repository

import com.docusing.signature.domain.model.UserSignatureEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface UserSignatureRepository : JpaRepository<UserSignatureEntity, UUID> {
    fun findAllByUserId(userId: UUID): List<UserSignatureEntity>
    
    fun findByUserIdAndIsDefault(userId: UUID, isDefault: Boolean): UserSignatureEntity?
    
    @Modifying
    @Query("UPDATE UserSignatureEntity u SET u.isDefault = false WHERE u.userId = ?1")
    fun clearDefaultForUser(userId: UUID)
}
