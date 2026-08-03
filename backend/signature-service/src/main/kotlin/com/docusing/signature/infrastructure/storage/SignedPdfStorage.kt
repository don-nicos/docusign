package com.docusing.signature.infrastructure.storage

import mu.KotlinLogging
import org.springframework.stereotype.Component
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.util.UUID

private val logger = KotlinLogging.logger {}

@Component
class SignedPdfStorage {

    private val baseDirectory: Path = Paths.get("data/signed-pdfs")

    init {
        Files.createDirectories(baseDirectory)
        logger.info { "Directorio de PDFs firmados inicializado: $baseDirectory" }
    }

    /**
     * Guarda un PDF firmado con número de versión
     * @param requestId ID de la solicitud de firma
     * @param versionNumber Número de versión (0=original, 1=primera firma, etc.)
     * @param pdfBytes Bytes del PDF firmado
     * @return Nombre del archivo guardado
     */
    fun saveSignedPdf(requestId: UUID, versionNumber: Int, pdfBytes: ByteArray): String {
        Files.createDirectories(baseDirectory)
        
        val filename = "signed_${requestId}_v${versionNumber}.pdf"
        val filePath = baseDirectory.resolve(filename)
        
        Files.write(filePath, pdfBytes)
        logger.info { "PDF firmado guardado: $filename (${pdfBytes.size} bytes)" }
        
        return filename
    }
    
    /**
     * Guarda el PDF original (versión 0)
     * @param requestId ID de la solicitud de firma
     * @param pdfBytes Bytes del PDF original
     * @return Nombre del archivo guardado
     */
    fun saveOriginalPdf(requestId: UUID, pdfBytes: ByteArray): String {
        return saveSignedPdf(requestId, 0, pdfBytes)
    }
    
    /**
     * Obtiene el Path de un PDF firmado
     */
    fun getSignedPdfPath(filename: String): Path {
        return baseDirectory.resolve(filename)
    }

    /**
     * Verifica si existe un PDF firmado
     */
    fun exists(filename: String): Boolean {
        return Files.exists(getSignedPdfPath(filename))
    }

    /**
     * Lee los bytes de un PDF firmado
     */
    fun readBytes(filename: String): ByteArray {
        return Files.readAllBytes(getSignedPdfPath(filename))
    }

    /**
     * Elimina un PDF firmado
     */
    fun delete(filename: String): Boolean {
        return try {
            Files.deleteIfExists(getSignedPdfPath(filename))
        } catch (e: Exception) {
            logger.error(e) { "Error al eliminar PDF firmado: $filename" }
            false
        }
    }
}
