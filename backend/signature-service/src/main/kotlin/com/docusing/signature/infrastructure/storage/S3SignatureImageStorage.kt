package com.docusing.signature.infrastructure.storage

import com.docusing.signature.infrastructure.config.S3Config
import mu.KotlinLogging
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Component
import org.springframework.web.multipart.MultipartFile
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.*
import java.util.Base64
import java.util.UUID
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths

private val logger = KotlinLogging.logger {}

/**
 * Storage de imágenes de firma en S3
 * Estructura de carpetas: signatures/{signerId}/{timestamp}.png
 */
@Component
@Primary
class S3SignatureImageStorage(
    private val s3Client: S3Client,
    private val s3Config: S3Config
) : SignatureImageStorage {

    /**
     * Guarda una imagen de firma desde un data URL base64
     */
    override fun saveFromDataUrl(signerId: UUID, dataUrl: String): String {
        // Extraer el base64 del data URL
        val base64Data = if (dataUrl.contains(",")) {
            dataUrl.substringAfter(",")
        } else {
            dataUrl
        }

        // Decodificar base64
        val imageBytes = Base64.getDecoder().decode(base64Data)
        return saveSignature(signerId, imageBytes)
    }

    /**
     * Guarda una imagen de firma desde bytes
     */
    fun saveSignature(signerId: UUID, imageBytes: ByteArray): String {
        val key = buildS3Key(signerId)
        
        try {
            val putRequest = PutObjectRequest.builder()
                .bucket(s3Config.signaturesBucket)
                .key(key)
                .contentType("image/png")
                .contentLength(imageBytes.size.toLong())
                .metadata(mapOf(
                    "signer-id" to signerId.toString()
                ))
                .build()
            
            s3Client.putObject(putRequest, RequestBody.fromBytes(imageBytes))
            
            logger.info { "Imagen de firma guardada en S3: $key (${imageBytes.size} bytes)" }
            return key
        } catch (e: Exception) {
            logger.error(e) { "Error al guardar imagen de firma en S3: $key" }
            throw RuntimeException("Error al guardar imagen en S3", e)
        }
    }

    /**
     * Obtiene el path completo de una firma (para compatibilidad)
     */
    override fun getSignaturePath(filename: String): Path {
        val targetPath = Paths.get("/tmp/s3-signatures/$filename")
        try {
            Files.createDirectories(targetPath.parent)
            val bytes = readBytes(filename)
            Files.write(targetPath, bytes)
            return targetPath
        } catch (e: Exception) {
            logger.error(e) { "Error al descargar imagen de firma a archivo temporal: $filename" }
            throw RuntimeException("Error al descargar imagen de firma desde S3", e)
        }
    }

    /**
     * Lee los bytes de una imagen de firma
     */
    override fun readBytes(relativePath: String): ByteArray {
        try {
            // Remove leading slash if present (S3 keys should not start with /)
            val cleanPath = relativePath.trimStart('/')
            
            val getRequest = GetObjectRequest.builder()
                .bucket(s3Config.signaturesBucket)
                .key(cleanPath)
                .build()
            
            return s3Client.getObjectAsBytes(getRequest).asByteArray()
        } catch (e: Exception) {
            logger.error(e) { "Error al leer imagen de firma desde S3: $relativePath" }
            throw RuntimeException("Error al leer imagen desde S3", e)
        }
    }

    /**
     * Verifica si existe una imagen
     */
    fun exists(key: String): Boolean {
        return try {
            val headRequest = HeadObjectRequest.builder()
                .bucket(s3Config.signaturesBucket)
                .key(key)
                .build()
            
            s3Client.headObject(headRequest)
            true
        } catch (e: NoSuchKeyException) {
            false
        } catch (e: Exception) {
            logger.error(e) { "Error al verificar existencia de imagen en S3: $key" }
            false
        }
    }

    /**
     * Elimina una imagen de firma
     */
    fun delete(key: String): Boolean {
        return try {
            val deleteRequest = DeleteObjectRequest.builder()
                .bucket(s3Config.signaturesBucket)
                .key(key)
                .build()
            
            s3Client.deleteObject(deleteRequest)
            logger.info { "Imagen de firma eliminada de S3: $key" }
            true
        } catch (e: Exception) {
            logger.error(e) { "Error al eliminar imagen de S3: $key" }
            false
        }
    }

    /**
     * Guarda desde MultipartFile
     */
    override fun saveSignatureImage(userId: UUID, file: MultipartFile): String {
        val imageBytes = file.bytes
        return saveSignature(userId, imageBytes)
    }

    /**
     * Alias para delete
     */
    override fun deleteSignatureImage(relativePath: String): Boolean {
        return delete(relativePath)
    }

    /**
     * Construye la key de S3 para una imagen de firma
     * Nuevo formato: user/{signerId}/signatures/{timestamp}.png
     * - Se guarda bajo la carpeta del usuario para mantener consistencia con PDFs firmados
     * - No afecta lecturas de imágenes ya existentes porque se persiste la key en DB
     */
    private fun buildS3Key(signerId: UUID): String {
        val timestamp = System.currentTimeMillis()
        return "user/$signerId/signatures/$timestamp.png"
    }
}
