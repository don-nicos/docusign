package com.docusing.signature.infrastructure.pdf

import com.docusing.signature.domain.model.SignatureRequestEntity
import mu.KotlinLogging
import org.apache.pdfbox.Loader
import org.apache.pdfbox.pdmodel.PDDocument
import org.apache.pdfbox.pdmodel.PDPage
import org.apache.pdfbox.pdmodel.PDPageContentStream
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject
import org.springframework.stereotype.Component
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.InputStream
import java.nio.file.Files
import java.nio.file.Path

private val logger = KotlinLogging.logger {}

@Component
class PDFSignatureInserter(
    private val pdfAuditCertificate: PDFAuditCertificate
) {

    /**
     * Inserta una imagen de firma en un documento PDF en las coordenadas especificadas
     * 
     * @param pdfInputStream InputStream del PDF original
     * @param signatureImagePath Ruta al archivo de imagen de la firma
     * @param pageNumber Número de página (0-indexed)
     * @param x Coordenada X (desde la izquierda)
     * @param y Coordenada Y (desde abajo)
     * @param width Ancho de la firma
     * @param height Alto de la firma
     * @return ByteArray del PDF modificado con la firma insertada
     */
    fun insertSignature(
        pdfInputStream: InputStream,
        signatureImagePath: Path,
        pageNumber: Int,
        x: Double,
        y: Double,
        width: Double,
        height: Double
    ): ByteArray {
        val document: PDDocument = Loader.loadPDF(pdfInputStream.readBytes())
        return document.use { doc ->
            try {
                // Remover seguridad/encriptación del PDF si existe
                if (doc.isEncrypted) {
                    logger.warn { "PDF está encriptado, removiendo seguridad para permitir modificaciones" }
                    doc.setAllSecurityToBeRemoved(true)
                }
                
                // Validar número de página
                if (pageNumber < 0 || pageNumber >= doc.numberOfPages) {
                    throw IllegalArgumentException(
                        "Número de página inválido: $pageNumber (documento tiene ${doc.numberOfPages} páginas)"
                    )
                }

                // Obtener la página
                val page = doc.getPage(pageNumber)

                // Cargar imagen de firma
                val signatureImage = PDImageXObject.createFromFileByContent(
                    signatureImagePath.toFile(),
                    doc
                )

                // Convertir coordenada Y desde el origen superior (frontend) al inferior (PDF)
                val pageHeight = page.mediaBox.height
                val yFromBottom = convertYFromTop(pageHeight, y, height)

                // Insertar imagen en la página
                val minWidth = 120.0
                val minHeight = 40.0
                val finalWidth = width.coerceAtLeast(minWidth)
                val finalHeight = height.coerceAtLeast(minHeight)

                val contentStream = PDPageContentStream(
                    doc,
                    page,
                    PDPageContentStream.AppendMode.APPEND,
                    true,
                    true
                )
                val clampedX = x.coerceIn(0.0, (page.mediaBox.width - finalWidth).toDouble())
                val clampedTopY = y.coerceIn(0.0, (pageHeight - finalHeight).toDouble())
                val clampedYFromBottom = convertYFromTop(pageHeight, clampedTopY, finalHeight)

                contentStream.use { cs ->
                    cs.drawImage(
                        signatureImage,
                        clampedX.toFloat(),
                        clampedYFromBottom.toFloat(),
                        finalWidth.toFloat(),
                        finalHeight.toFloat()
                    )
                }

                // Guardar PDF modificado en ByteArray
                val outputStream = ByteArrayOutputStream()
                doc.save(outputStream)
                val result = outputStream.toByteArray()
                logger.info {
                    "Firma insertada en página $pageNumber en posición ($x, $y) con tamaño ${finalWidth}x${finalHeight}. PDF resultante: ${result.size} bytes"
                }
                result
            } catch (e: Exception) {
                logger.error(e) { "Error al insertar firma en PDF (página=$pageNumber, x=$x, y=$y, w=$width, h=$height)" }
                throw PDFSignatureInsertionException("Error al insertar firma en PDF", e)
            }
        }
    }

    /**
     * Inserta múltiples firmas en un documento PDF
     * 
     * @param pdfInputStream InputStream del PDF original
     * @param signatures Lista de datos de firmas a insertar
     * @param signatureRequest Solicitud de firma (opcional, para obtener pdfViewerWidth)
     * @return ByteArray del PDF modificado con todas las firmas
     */
    fun insertMultipleSignatures(
        pdfInputStream: InputStream,
        signatures: List<SignatureData>,
        signatureRequest: SignatureRequestEntity? = null
    ): ByteArray {
        val document: PDDocument = Loader.loadPDF(pdfInputStream.readBytes())
        return document.use { doc ->
            try {
                // Remover seguridad/encriptación del PDF si existe
                if (doc.isEncrypted) {
                    logger.warn { "PDF está encriptado, removiendo seguridad para permitir modificaciones" }
                    doc.setAllSecurityToBeRemoved(true)
                }
                
                signatures.forEach { signature ->
                    // Validar página
                    if (signature.pageNumber < 0 || signature.pageNumber >= doc.numberOfPages) {
                        logger.warn { 
                            "Saltando firma en página inválida ${signature.pageNumber} (documento tiene ${doc.numberOfPages} páginas)" 
                        }
                        return@forEach
                    }

                    val page = doc.getPage(signature.pageNumber)
                    val signatureImage = PDImageXObject.createFromFileByContent(
                        signature.imagePath.toFile(),
                        doc
                    )

                    val pageWidth = page.mediaBox.width
                    val pageHeight = page.mediaBox.height
                    
                    // Escalar coordenadas del visor HTML al tamaño real del PDF
                    val pdfViewerWidth = signatureRequest?.pdfViewerWidth?.toFloat() ?: pageWidth
                    val scale = if (pdfViewerWidth > 0) pageWidth / pdfViewerWidth else 1.0f
                    
                    val scaledX = signature.x * scale
                    val scaledY = signature.y * scale
                    val scaledWidth = signature.width * scale
                    val scaledHeight = signature.height * scale

                    // Solo aplicar mínimo si el tamaño es extremadamente pequeño (< 50pt)
                    // Para mantener las proporciones del contenedor original
                    val minSize = 50.0
                    val finalWidth = if (scaledWidth < minSize) minSize else scaledWidth
                    val finalHeight = if (scaledHeight < minSize) minSize else scaledHeight
                    
                    logger.info { 
                        "Escalando firma ${signature.signerId}: viewerWidth=$pdfViewerWidth, pageWidth=$pageWidth, scale=$scale" 
                    }
                    logger.info { 
                        "Original: x=${signature.x}, y=${signature.y}, w=${signature.width}, h=${signature.height}" 
                    }
                    logger.info { 
                        "Escalado: x=$scaledX, y=$scaledY, w=$scaledWidth, h=$scaledHeight" 
                    }
                    
                    val clampedX = scaledX.coerceIn(0.0, (pageWidth - finalWidth).toDouble())
                    val clampedTopY = scaledY.coerceIn(0.0, (pageHeight - finalHeight).toDouble())
                    val yFromBottom = convertYFromTop(pageHeight, clampedTopY, finalHeight)

                    val contentStream = PDPageContentStream(
                        doc,
                        page,
                        PDPageContentStream.AppendMode.APPEND,
                        true,
                        true
                    )
                    contentStream.use { cs ->
                        cs.drawImage(
                            signatureImage,
                            clampedX.toFloat(),
                            yFromBottom.toFloat(),
                            finalWidth.toFloat(),
                            finalHeight.toFloat()
                        )
                    }

                    logger.info { 
                        "Firma ${signature.signerId} insertada en página ${signature.pageNumber} con tamaño ${finalWidth}x${finalHeight} (scale=$scale)" 
                    }
                }
                
                // Agregar certificado de auditoría si se proporciona la solicitud
                if (signatureRequest != null) {
                    pdfAuditCertificate.addAuditCertificate(doc, signatureRequest)
                    logger.info { "Certificado de auditoría agregado al PDF" }
                }

                val outputStream = ByteArrayOutputStream()
                doc.save(outputStream)
                outputStream.toByteArray()
            } catch (e: Exception) {
                logger.error(e) { "Error al insertar múltiples firmas en PDF" }
                throw PDFSignatureInsertionException("Error al insertar firmas en PDF", e)
            }
        }
    }

    /**
     * Calcula las coordenadas Y desde la parte superior de la página (más intuitivo)
     * PDFBox usa coordenadas desde abajo, esta función convierte
     */
    fun convertYFromTop(pageHeight: Float, yFromTop: Double, signatureHeight: Double): Double {
        return (pageHeight - yFromTop - signatureHeight).toDouble()
    }
}

/**
 * Datos de una firma a insertar
 */
data class SignatureData(
    val signerId: String,
    val imagePath: Path,
    val pageNumber: Int,
    val x: Double,
    val y: Double,
    val width: Double,
    val height: Double
)

/**
 * Excepción para errores al insertar firmas en PDF
 */
class PDFSignatureInsertionException(
    message: String,
    cause: Throwable? = null
) : RuntimeException(message, cause)
