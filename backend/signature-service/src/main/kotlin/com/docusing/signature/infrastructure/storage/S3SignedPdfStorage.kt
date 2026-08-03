package com.docusing.signature.infrastructure.storage

import com.docusing.signature.infrastructure.config.S3Config
import mu.KotlinLogging
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Component
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.*
import java.util.UUID

private val logger = KotlinLogging.logger {}

/**
 * Storage de PDFs firmados en S3
 * Estructura de carpetas: {ownerId}/{requestId}/v{versionNumber}.pdf
 */
@Component
@Primary
class S3SignedPdfStorage(
    private val s3Client: S3Client,
    private val s3Config: S3Config
) {

    /**
     * Guarda un PDF firmado en S3
     * @param ownerId ID del usuario que creó la solicitud
     * @param requestId ID de la solicitud de firma
     * @param versionNumber Número de versión
     * @param pdfBytes Bytes del PDF
     * @return Ruta S3 del archivo (key)
     */
    fun saveSignedPdf(ownerId: UUID, requestId: UUID, versionNumber: Int, pdfBytes: ByteArray): String {
        val key = buildS3Key(ownerId = ownerId, requestId = requestId, versionNumber = versionNumber, organizationId = null, subCompanyId = null)
        
        try {
            val putRequest = PutObjectRequest.builder()
                .bucket(s3Config.signedPdfsBucket)
                .key(key)
                .contentType("application/pdf")
                .contentLength(pdfBytes.size.toLong())
                .metadata(mapOf(
                    "owner-id" to ownerId.toString(),
                    "request-id" to requestId.toString(),
                    "version-number" to versionNumber.toString()
                ))
                .build()
            
            s3Client.putObject(putRequest, RequestBody.fromBytes(pdfBytes))
            
            logger.info { "PDF guardado en S3: $key (${pdfBytes.size} bytes)" }
            return key
        } catch (e: Exception) {
            logger.error(e) { "Error al guardar PDF en S3: $key" }
            throw RuntimeException("Error al guardar PDF en S3", e)
        }
    }

    /**
     * Guarda el PDF original (versión 0)
     */
    fun saveOriginalPdf(ownerId: UUID, requestId: UUID, pdfBytes: ByteArray): String {
        return saveSignedPdf(ownerId, requestId, 0, pdfBytes)
    }

    /**
     * Lee los bytes de un PDF desde S3
     */
    fun readBytes(key: String): ByteArray {
        try {
            val getRequest = GetObjectRequest.builder()
                .bucket(s3Config.signedPdfsBucket)
                .key(key)
                .build()
            
            return s3Client.getObjectAsBytes(getRequest).asByteArray()
        } catch (e: Exception) {
            logger.error(e) { "Error al leer PDF desde S3: $key" }
            throw RuntimeException("Error al leer PDF desde S3", e)
        }
    }

    /**
     * Verifica si existe un PDF en S3
     */
    fun exists(key: String): Boolean {
        return try {
            val headRequest = HeadObjectRequest.builder()
                .bucket(s3Config.signedPdfsBucket)
                .key(key)
                .build()
            
            s3Client.headObject(headRequest)
            true
        } catch (e: NoSuchKeyException) {
            false
        } catch (e: Exception) {
            logger.error(e) { "Error al verificar existencia de PDF en S3: $key" }
            false
        }
    }

    /**
     * Elimina un PDF de S3
     */
    fun delete(key: String): Boolean {
        return try {
            val deleteRequest = DeleteObjectRequest.builder()
                .bucket(s3Config.signedPdfsBucket)
                .key(key)
                .build()
            
            s3Client.deleteObject(deleteRequest)
            logger.info { "PDF eliminado de S3: $key" }
            true
        } catch (e: Exception) {
            logger.error(e) { "Error al eliminar PDF de S3: $key" }
            false
        }
    }

    /**
     * Lista todas las versiones de un documento
     */
    fun listVersions(ownerId: UUID, requestId: UUID): List<String> {
        val prefix = "$ownerId/$requestId/"
        
        try {
            val listRequest = ListObjectsV2Request.builder()
                .bucket(s3Config.signedPdfsBucket)
                .prefix(prefix)
                .build()
            
            val response = s3Client.listObjectsV2(listRequest)
            return response.contents().map { it.key() }
        } catch (e: Exception) {
            logger.error(e) { "Error al listar versiones en S3: $prefix" }
            return emptyList()
        }
    }

    /**
     * Obtiene la URL presignada para descarga directa (válida por 1 hora)
     */
    fun getPresignedUrl(key: String, expirationMinutes: Long = 60): String {
        // TODO: Implementar presigned URLs si es necesario
        // Por ahora retornamos la URL directa de LocalStack
        return "http://localhost:4566/${s3Config.signedPdfsBucket}/$key"
    }

    /**
     * Construye la key de S3 con la estructura de carpetas
     * Formato: {ownerId}/{requestId}/v{versionNumber}.pdf
     */
    fun saveSignedPdf(
        ownerId: UUID,
        requestId: UUID,
        versionNumber: Int,
        pdfBytes: ByteArray,
        organizationId: UUID?,
        subCompanyId: UUID?
    ): String {
        val key = buildS3Key(ownerId, requestId, versionNumber, organizationId, subCompanyId)

        try {
            val putRequest = PutObjectRequest.builder()
                .bucket(s3Config.signedPdfsBucket)
                .key(key)
                .contentType("application/pdf")
                .contentLength(pdfBytes.size.toLong())
                .metadata(mapOf(
                    "owner-id" to ownerId.toString(),
                    "request-id" to requestId.toString(),
                    "version-number" to versionNumber.toString(),
                    "organization-id" to (organizationId?.toString() ?: "") ,
                    "sub-company-id" to (subCompanyId?.toString() ?: "")
                ))
                .build()

            s3Client.putObject(putRequest, RequestBody.fromBytes(pdfBytes))

            logger.info { "PDF guardado en S3: $key (${pdfBytes.size} bytes)" }
            return key
        } catch (e: Exception) {
            logger.error(e) { "Error al guardar PDF en S3: $key" }
            throw RuntimeException("Error al guardar PDF en S3", e)
        }
    }

    private fun buildS3Key(
        ownerId: UUID,
        requestId: UUID,
        versionNumber: Int,
        organizationId: UUID?,
        subCompanyId: UUID?
    ): String {
        return if (organizationId != null) {
            val sub = subCompanyId?.toString() ?: "sin-empresa"
            "org/$organizationId/$sub/$requestId/v$versionNumber.pdf"
        } else {
            "user/$ownerId/$requestId/v$versionNumber.pdf"
        }
    }
}
