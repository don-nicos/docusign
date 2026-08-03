package com.docusing.signature.infrastructure.storage

import mu.KotlinLogging
import org.springframework.stereotype.Component
import org.springframework.web.multipart.MultipartFile
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.util.Base64
import java.util.UUID

private val logger = KotlinLogging.logger {}

interface SignatureImageStorage {
    fun saveFromDataUrl(signerId: UUID, dataUrl: String): String
    fun saveSignatureImage(userId: UUID, file: MultipartFile): String
    fun deleteSignatureImage(relativePath: String): Boolean
    fun readBytes(relativePath: String): ByteArray
    fun getSignaturePath(filename: String): Path
}

@Component
class LocalSignatureImageStorage : SignatureImageStorage {

    private val baseDirectory: Path = Paths.get("data/signatures")

    init {
        Files.createDirectories(baseDirectory)
        logger.info { "Directorio de firmas inicializado: $baseDirectory" }
    }

    /**
     * Guarda una imagen de firma desde un data URL base64
     * @param signerId ID del firmante
     * @param dataUrl Data URL en formato "data:image/png;base64,..."
     * @return Ruta relativa del archivo guardado
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
     * Guarda una imagen de firma desde un array de bytes
     * @param signerId ID del firmante
     * @param imageBytes Bytes de la imagen de firma
     * @return Ruta relativa del archivo guardado
     */
    fun saveSignature(signerId: UUID, imageBytes: ByteArray): String {
        Files.createDirectories(baseDirectory)
        
        val filename = "${signerId}_${System.currentTimeMillis()}.png"
        val filePath = baseDirectory.resolve(filename)
        
        Files.write(filePath, imageBytes)
        logger.info { "Firma guardada: $filename (${imageBytes.size} bytes)" }
        
        return filename
    }
    
    /**
     * Obtiene el Path de una firma guardada
     */
    override fun getSignaturePath(filename: String): Path {
        return baseDirectory.resolve(filename)
    }

    /**
     * Obtiene la ruta completa de una imagen de firma
     */
    fun getFilePath(relativePath: String): Path {
        return baseDirectory.resolve(relativePath)
    }

    /**
     * Verifica si existe una imagen de firma
     */
    fun exists(relativePath: String): Boolean {
        return Files.exists(getFilePath(relativePath))
    }

    /**
     * Elimina una imagen de firma
     */
    fun delete(relativePath: String): Boolean {
        return try {
            Files.deleteIfExists(getFilePath(relativePath))
        } catch (e: Exception) {
            logger.error(e) { "Error al eliminar imagen de firma: $relativePath" }
            false
        }
    }

    /**
     * Lee los bytes de una imagen de firma
     */
    override fun readBytes(relativePath: String): ByteArray {
        return Files.readAllBytes(getFilePath(relativePath))
    }

    /**
     * Guarda una imagen de firma desde un MultipartFile
     * @param userId ID del usuario
     * @param file Archivo multipart
     * @return Ruta relativa del archivo guardado
     */
    override fun saveSignatureImage(userId: UUID, file: MultipartFile): String {
        val imageBytes = file.bytes
        return saveSignature(userId, imageBytes)
    }

    /**
     * Elimina una imagen de firma (alias para delete)
     */
    override fun deleteSignatureImage(relativePath: String): Boolean {
        return delete(relativePath)
    }
}
