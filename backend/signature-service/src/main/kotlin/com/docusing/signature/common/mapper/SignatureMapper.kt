package com.docusing.signature.common.mapper

import com.docusing.signature.common.dto.response.SignatureRequestResponse
import com.docusing.signature.common.dto.response.SignerResponse
import com.docusing.signature.common.dto.response.SignaturePositionResponse
import com.docusing.signature.domain.model.SignatureRequestEntity
import com.docusing.signature.domain.model.SignerEntity
import org.springframework.stereotype.Component

@Component
class SignatureMapper {
    fun toResponse(entity: SignatureRequestEntity): SignatureRequestResponse = SignatureRequestResponse(
        id = entity.id?.toString() ?: "",
        documentId = entity.documentId.toString(),
        ownerId = entity.ownerId.toString(),
        title = entity.title,
        status = entity.status.name,
        expiresAt = entity.expiresAt,
        completedAt = entity.completedAt,
        documentHash = entity.documentHash,
        signers = entity.signers.map { toSignerResponse(it) },
        pdfViewerWidth = entity.pdfViewerWidth,
        createdAt = entity.createdAt!!,
        updatedAt = entity.updatedAt
    )

    fun toSignerResponse(entity: SignerEntity): SignerResponse = SignerResponse(
        id = entity.id?.toString() ?: "",
        email = entity.email,
        fullName = entity.fullName,
        orderIndex = entity.orderIndex,
        status = entity.status,
        signedAt = entity.signedAt,
        rejectionReason = entity.rejectionReason,
        signatureImagePath = entity.signatureImagePath,
        // Sistema nuevo: múltiples posiciones de firma
        positions = entity.signaturePositions.map { pos ->
            SignaturePositionResponse(
                pageNumber = pos.pageNumber,
                positionX = pos.positionX,
                positionY = pos.positionY,
                width = pos.width,
                height = pos.height,
                label = pos.label
            )
        },
        signerIpAddress = entity.signerIpAddress,
        authenticationMethod = entity.authenticationMethod,
        signerUserAgent = entity.signerUserAgent
    )

    fun toResponseList(entities: List<SignatureRequestEntity>): List<SignatureRequestResponse> =
        entities.map(::toResponse)
}
