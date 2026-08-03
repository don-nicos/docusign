package com.docusing.auth.core.service

import com.docusing.auth.common.dto.request.CreateSignatureRequest
import com.docusing.auth.common.dto.request.UpdateSignatureRequest
import com.docusing.auth.common.dto.response.SavedSignatureResponse
import com.docusing.auth.domain.model.SavedSignature
import com.docusing.auth.domain.repository.SavedSignatureRepository
import jakarta.persistence.EntityNotFoundException
import mu.KotlinLogging
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

private val logger = KotlinLogging.logger {}

@Service
class SavedSignatureService(
    private val savedSignatureRepository: SavedSignatureRepository
) {
    @Transactional(readOnly = true)
    fun getUserSignatures(userId: UUID): List<SavedSignatureResponse> {
        return savedSignatureRepository.findByUserId(userId)
            .map { it.toResponse() }
    }

    @Transactional
    fun createSignature(userId: UUID, request: CreateSignatureRequest): SavedSignatureResponse {
        // Si se marca como default, quitar el default de las demás
        if (request.isDefault) {
            val currentDefault = savedSignatureRepository.findByUserIdAndIsDefault(userId, true)
            currentDefault?.let {
                savedSignatureRepository.save(
                    SavedSignature(
                        id = it.id,
                        userId = it.userId,
                        name = it.name,
                        signatureData = it.signatureData,
                        isDefault = false,
                        createdAt = it.createdAt,
                        updatedAt = it.updatedAt
                    )
                )
            }
        }

        val signature = SavedSignature(
            userId = userId,
            name = request.name,
            signatureData = request.signatureData,
            isDefault = request.isDefault
        )

        val saved = savedSignatureRepository.save(signature)
        logger.info { "Firma guardada para usuario $userId: ${saved.id}" }
        return saved.toResponse()
    }

    @Transactional
    fun updateSignature(userId: UUID, signatureId: UUID, request: UpdateSignatureRequest): SavedSignatureResponse {
        val signature = savedSignatureRepository.findById(signatureId)
            .orElseThrow { EntityNotFoundException("Firma no encontrada") }

        if (signature.userId != userId) {
            throw IllegalArgumentException("No tienes permiso para modificar esta firma")
        }

        // Si se marca como default, quitar el default de las demás
        if (request.isDefault == true) {
            val currentDefault = savedSignatureRepository.findByUserIdAndIsDefault(userId, true)
            currentDefault?.let {
                if (it.id != signatureId) {
                    savedSignatureRepository.save(
                        SavedSignature(
                            id = it.id,
                            userId = it.userId,
                            name = it.name,
                            signatureData = it.signatureData,
                            isDefault = false,
                            createdAt = it.createdAt,
                            updatedAt = it.updatedAt
                        )
                    )
                }
            }
        }

        val updated = SavedSignature(
            id = signature.id,
            userId = signature.userId,
            name = request.name ?: signature.name,
            signatureData = signature.signatureData,
            isDefault = request.isDefault ?: signature.isDefault,
            createdAt = signature.createdAt,
            updatedAt = signature.updatedAt
        )

        return savedSignatureRepository.save(updated).toResponse()
    }

    @Transactional
    fun deleteSignature(userId: UUID, signatureId: UUID) {
        val signature = savedSignatureRepository.findById(signatureId)
            .orElseThrow { EntityNotFoundException("Firma no encontrada") }

        if (signature.userId != userId) {
            throw IllegalArgumentException("No tienes permiso para eliminar esta firma")
        }

        savedSignatureRepository.deleteById(signatureId)
        logger.info { "Firma eliminada: $signatureId" }
    }

    @Transactional(readOnly = true)
    fun getDefaultSignature(userId: UUID): SavedSignatureResponse? {
        return savedSignatureRepository.findByUserIdAndIsDefault(userId, true)?.toResponse()
    }

    private fun SavedSignature.toResponse() = SavedSignatureResponse(
        id = id.toString(),
        name = name,
        signatureData = signatureData,
        isDefault = isDefault,
        createdAt = createdAt
    )
}
