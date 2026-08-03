package com.docusing.auth.domain.repository

import com.docusing.auth.domain.model.SavedSignature
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface SavedSignatureRepository : JpaRepository<SavedSignature, UUID> {
    fun findByUserId(userId: UUID): List<SavedSignature>
    fun findByUserIdAndIsDefault(userId: UUID, isDefault: Boolean): SavedSignature?
    fun deleteByIdAndUserId(id: UUID, userId: UUID): Int
}
