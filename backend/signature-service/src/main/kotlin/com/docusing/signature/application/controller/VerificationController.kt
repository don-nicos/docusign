package com.docusing.signature.application.controller

import com.docusing.signature.common.dto.response.SignatureVerificationResponse
import com.docusing.signature.common.dto.response.SignerVerificationResponse
import com.docusing.signature.common.web.ApiRoutes
import com.docusing.signature.domain.repository.SignatureRequestRepository
import mu.KotlinLogging
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

private val logger = KotlinLogging.logger {}

/**
 * Endpoint público de verificación de firmas.
 * Se muestra al escanear los QR del certificado de auditoría.
 */
@RestController
@RequestMapping(ApiRoutes.Signatures.BASE)
class VerificationController(
    private val signatureRequestRepository: SignatureRequestRepository
) {

    @GetMapping(ApiRoutes.Signatures.VERIFY)
    fun verifySignatureRequest(
        @PathVariable requestId: UUID,
        @RequestParam("signerId", required = false) signerId: UUID?
    ): ResponseEntity<SignatureVerificationResponse> {
        logger.info { "Verificación pública de solicitud $requestId, signerId=$signerId" }

        val request = signatureRequestRepository.findById(requestId)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada") }

        val signers = request.signers.orEmpty()
            .filter { signerId == null || it.id == signerId }
            .sortedBy { it.orderIndex }
            .map { signer ->
                SignerVerificationResponse(
                    signerId = signer.id.toString(),
                    fullName = signer.fullName,
                    email = signer.email,
                    status = signer.status.name,
                    signedAt = signer.signedAt,
                    authenticationMethod = signer.authenticationMethod,
                    ipAddress = signer.signerIpAddress
                )
            }

        val response = SignatureVerificationResponse(
            requestId = request.id.toString(),
            documentTitle = request.title,
            status = request.status.name,
            documentHash = request.documentHash,
            completedAt = request.completedAt,
            signers = signers
        )

        return ResponseEntity.ok(response)
    }
}
