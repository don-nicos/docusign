package com.docusing.document.infrastructure.storage

import com.docusing.document.infrastructure.config.S3Config
import mu.KotlinLogging
import org.springframework.context.annotation.Primary
import org.springframework.core.io.ByteArrayResource
import org.springframework.core.io.Resource
import org.springframework.stereotype.Component
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest
import software.amazon.awssdk.services.s3.model.GetObjectRequest
import software.amazon.awssdk.services.s3.model.HeadObjectRequest
import software.amazon.awssdk.services.s3.model.NoSuchKeyException
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import java.io.InputStream
import java.security.MessageDigest
import java.time.Instant
import java.util.UUID

private val logger = KotlinLogging.logger {}

/**
 * Storage de documentos en S3
 * Estructura de carpetas:
 *  - user/{ownerId}/{timestamp}-{uuid}-{filename}
 *  - org/{organizationId}/{subCompanyId|sin-empresa}/{timestamp}-{uuid}-{filename}
 */
@Component
@Primary
class S3DocumentStorage(
    private val s3Client: S3Client,
    private val s3Config: S3Config
) : DocumentStorage {

    override fun save(
        ownerId: UUID,
        filename: String,
        contentType: String?,
        inputStream: InputStream,
        organizationId: UUID?,
        subCompanyId: UUID?
    ): DocumentStorageResult {
        val timestamp = Instant.now().toEpochMilli()
        val sanitized = filename.replace("/", "_").replace("\\", "_")
        val key = buildS3Key(ownerId, organizationId, subCompanyId, "$timestamp-${UUID.randomUUID()}-$sanitized")

        val bytes = inputStream.readAllBytes()
        val digest = MessageDigest.getInstance("SHA-256")
        val hash = digest.digest(bytes).joinToString(separator = "") { b -> "%02x".format(b) }

        try {
            val put = PutObjectRequest.builder()
                .bucket(s3Config.documentsBucket)
                .key(key)
                .contentType(contentType ?: "application/octet-stream")
                .contentLength(bytes.size.toLong())
                .metadata(
                    mapOf(
                        "owner-id" to ownerId.toString(),
                        "organization-id" to (organizationId?.toString() ?: ""),
                        "sub-company-id" to (subCompanyId?.toString() ?: "")
                    )
                )
                .build()

            s3Client.putObject(put, RequestBody.fromBytes(bytes))
            logger.info { "Documento guardado en S3: ${s3Config.documentsBucket}/$key (${bytes.size} bytes)" }
            return DocumentStorageResult(
                storageKey = key,
                size = bytes.size.toLong(),
                contentType = contentType,
                hashSha256 = hash
            )
        } catch (e: Exception) {
            logger.error(e) { "Error al guardar documento en S3: ${s3Config.documentsBucket}/$key" }
            throw RuntimeException("Error al guardar documento en S3", e)
        }
    }

    override fun load(storageKey: String): DocumentStorageResource {
        try {
            val head = s3Client.headObject(
                HeadObjectRequest.builder()
                    .bucket(s3Config.documentsBucket)
                    .key(storageKey)
                    .build()
            )
            val obj = s3Client.getObjectAsBytes(
                GetObjectRequest.builder()
                    .bucket(s3Config.documentsBucket)
                    .key(storageKey)
                    .build()
            )
            val resource: Resource = ByteArrayResource(obj.asByteArray())
            return DocumentStorageResource(
                resource = resource,
                filename = storageKey.substringAfterLast('/'),
                contentType = head.contentType(),
                size = head.contentLength()
            )
        } catch (e: Exception) {
            logger.error(e) { "Error al leer documento desde S3: ${s3Config.documentsBucket}/$storageKey" }
            throw RuntimeException("Error al leer documento desde S3", e)
        }
    }

    override fun delete(storageKey: String) {
        try {
            s3Client.deleteObject(
                DeleteObjectRequest.builder()
                    .bucket(s3Config.documentsBucket)
                    .key(storageKey)
                    .build()
            )
            logger.info { "Documento eliminado de S3: ${s3Config.documentsBucket}/$storageKey" }
        } catch (e: NoSuchKeyException) {
            logger.warn { "Intento de eliminar documento inexistente: $storageKey" }
        } catch (e: Exception) {
            logger.error(e) { "Error al eliminar documento en S3: ${s3Config.documentsBucket}/$storageKey" }
        }
    }

    private fun buildS3Key(ownerId: UUID, organizationId: UUID?, subCompanyId: UUID?, fileKey: String): String {
        return if (organizationId != null) {
            val sub = subCompanyId?.toString() ?: "sin-empresa"
            "org/$organizationId/$sub/$fileKey"
        } else {
            "user/$ownerId/$fileKey"
        }
    }
}
