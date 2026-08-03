package com.docusing.signature.core.service

import com.docusing.signature.domain.model.UserSignatureEntity
import com.docusing.signature.domain.repository.UserSignatureRepository
import com.docusing.signature.infrastructure.storage.SignatureImageStorage
import mu.KotlinLogging
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import java.util.UUID

private val logger = KotlinLogging.logger {}

@Service
class UserSignatureService(
    private val userSignatureRepository: UserSignatureRepository,
    private val signatureImageStorage: SignatureImageStorage
) {

    @Transactional(readOnly = true)
    fun getUserSignatures(userId: UUID): List<UserSignatureEntity> {
        return userSignatureRepository.findAllByUserId(userId)
    }

    @Transactional(readOnly = true)
    fun getDefaultSignature(userId: UUID): UserSignatureEntity? {
        return userSignatureRepository.findByUserIdAndIsDefault(userId, true)
    }

    @Transactional
    fun saveUserSignature(
        userId: UUID,
        signatureImage: MultipartFile,
        name: String?,
        setAsDefault: Boolean
    ): UserSignatureEntity {
        // Guardar imagen
        val imagePath = signatureImageStorage.saveSignatureImage(userId, signatureImage)
        
        // Si se marca como default, quitar el default de las demás
        if (setAsDefault) {
            userSignatureRepository.clearDefaultForUser(userId)
        }
        
        val signature = UserSignatureEntity(
            userId = userId,
            signatureImagePath = imagePath,
            name = name,
            isDefault = setAsDefault
        )
        
        val saved = userSignatureRepository.save(signature)
        logger.info { "Firma guardada para usuario $userId: ${saved.id}" }
        return saved
    }

    @Transactional
    fun deleteUserSignature(userId: UUID, signatureId: UUID) {
        logger.debug { "Deleting signature $signatureId for user $userId" }
        
        val signature = userSignatureRepository.findById(signatureId)
            .orElseThrow { IllegalArgumentException("Signature not found") }
        
        if (signature.userId != userId) {
            logger.warn { "User $userId attempted to delete signature $signatureId owned by ${signature.userId}" }
            throw IllegalArgumentException("You do not have permission to delete this signature")
        }
        
        try {
            signatureImageStorage.deleteSignatureImage(signature.signatureImagePath)
            userSignatureRepository.delete(signature)
            logger.info { "Signature deleted: $signatureId for user $userId" }
        } catch (e: Exception) {
            logger.error(e) { "Error deleting signature $signatureId for user $userId" }
            throw e
        }
    }

    @Transactional
    fun setDefaultSignature(userId: UUID, signatureId: UUID) {
        logger.debug { "Setting signature $signatureId as default for user $userId" }
        
        val signature = userSignatureRepository.findById(signatureId)
            .orElseThrow { IllegalArgumentException("Signature not found") }
        
        if (signature.userId != userId) {
            logger.warn { "User $userId attempted to modify signature $signatureId owned by ${signature.userId}" }
            throw IllegalArgumentException("You do not have permission to modify this signature")
        }
        
        try {
            userSignatureRepository.clearDefaultForUser(userId)
            signature.isDefault = true
            userSignatureRepository.save(signature)
            logger.info { "Signature $signatureId set as default for user $userId" }
        } catch (e: Exception) {
            logger.error(e) { "Error setting signature $signatureId as default for user $userId" }
            throw e
        }
    }
}
