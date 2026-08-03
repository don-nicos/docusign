package com.docusing.signature.core.service

import mu.KotlinLogging
import net.sourceforge.tess4j.Tesseract
import org.apache.pdfbox.Loader
import org.apache.pdfbox.pdmodel.PDDocument
import org.apache.pdfbox.rendering.PDFRenderer
import org.springframework.stereotype.Service
import java.awt.image.BufferedImage
import java.io.InputStream

private val logger = KotlinLogging.logger {}

/**
 * Servicio para detectar automáticamente campos de firma en documentos PDF
 * usando OCR y análisis de patrones
 */
@Service
class SignatureFieldDetectionService {

    companion object {
        // Patrones comunes para campos de firma
        private val SIGNATURE_PATTERNS = listOf(
            Regex("firma", RegexOption.IGNORE_CASE),
            Regex("sign", RegexOption.IGNORE_CASE),
            Regex("firmante", RegexOption.IGNORE_CASE),
            Regex("signer", RegexOption.IGNORE_CASE),
            Regex("signature", RegexOption.IGNORE_CASE),
            Regex("x_+", RegexOption.IGNORE_CASE), // Líneas X_______
            Regex("_{5,}"), // Líneas largas _____
            Regex("fecha.*firma", RegexOption.IGNORE_CASE),
            Regex("nombre.*firma", RegexOption.IGNORE_CASE)
        )
        
        // Tamaño estándar de campo de firma
        const val DEFAULT_SIGNATURE_WIDTH = 200.0
        const val DEFAULT_SIGNATURE_HEIGHT = 80.0
        const val MARGIN_BELOW_TEXT = 10.0 // Espacio debajo del texto detectado
    }

    /**
     * Detecta posibles campos de firma en un PDF
     * Usa OCR simple sin dependencias pesadas
     */
    fun detectSignatureFields(pdfBytes: ByteArray): List<SignatureFieldSuggestion> {
        return try {
            logger.info { "Iniciando detección de campos de firma (método simple)" }
            
            val document = Loader.loadPDF(pdfBytes)
            val suggestions = mutableListOf<SignatureFieldSuggestion>()
            
            document.use { doc ->
                val renderer = PDFRenderer(doc)
                
                // Analizar cada página
                for (pageIndex in 0 until doc.numberOfPages) {
                    val page = doc.getPage(pageIndex)
                    val pageHeight = page.mediaBox.height
                    val pageWidth = page.mediaBox.width
                    
                    logger.info { "Analizando página ${pageIndex + 1} (${pageWidth}x${pageHeight})" }
                    
                    // Renderizar página a imagen para OCR
                    val image = renderer.renderImageWithDPI(pageIndex, 150f)
                    
                    // Detectar texto con OCR
                    val textBoxes = performSimpleOCR(image)
                    
                    // Buscar patrones de firma
                    textBoxes.forEach { box ->
                        if (matchesSignaturePattern(box.text)) {
                            // Calcular posición sugerida (debajo del texto detectado)
                            val suggestedY = box.y + box.height + MARGIN_BELOW_TEXT
                            
                            // Validar que la posición esté dentro de la página
                            if (suggestedY + DEFAULT_SIGNATURE_HEIGHT < pageHeight) {
                                suggestions.add(
                                    SignatureFieldSuggestion(
                                        page = pageIndex + 1, // 1-indexed para el frontend
                                        x = box.x,
                                        y = suggestedY,
                                        width = DEFAULT_SIGNATURE_WIDTH,
                                        height = DEFAULT_SIGNATURE_HEIGHT,
                                        confidence = box.confidence,
                                        detectedText = box.text
                                    )
                                )
                                logger.info { "Campo detectado en página ${pageIndex + 1}: '${box.text}' en (${box.x}, ${suggestedY})" }
                            }
                        }
                    }
                }
            }
            
            // Deduplicar sugerencias muy cercanas
            val deduplicated = deduplicateSuggestions(suggestions)
            
            logger.info { "Detección completada: ${deduplicated.size} campos sugeridos" }
            deduplicated
            
        } catch (e: Exception) {
            logger.error(e) { "Error en detección de campos de firma" }
            // Retornar sugerencias por defecto en caso de error
            getDefaultSuggestions()
        }
    }

    /**
     * OCR simple usando Tesseract (si está disponible)
     * Si no está disponible, retorna lista vacía
     */
    private fun performSimpleOCR(image: BufferedImage): List<TextBox> {
        return try {
            val tesseract = Tesseract()
            tesseract.setDatapath("/usr/share/tesseract-ocr/4.00/tessdata") // Path común en Linux/Mac
            tesseract.setLanguage("spa") // Español
            
            // Obtener texto con coordenadas
            val result = tesseract.doOCR(image)
            
            // Parsear resultado (simplificado)
            parseOCRResult(result, image.width, image.height)
            
        } catch (e: Exception) {
            logger.warn { "OCR no disponible, usando detección por heurísticas: ${e.message}" }
            // Fallback: usar heurísticas sin OCR
            getHeuristicSuggestions(image)
        }
    }

    /**
     * Parsea el resultado del OCR
     */
    private fun parseOCRResult(text: String, imageWidth: Int, imageHeight: Int): List<TextBox> {
        val boxes = mutableListOf<TextBox>()
        
        text.lines().forEachIndexed { index, line ->
            if (line.isNotBlank()) {
                // Estimación simple de posición (mejorable con OCR detallado)
                boxes.add(
                    TextBox(
                        text = line.trim(),
                        x = 50.0, // Margen izquierdo por defecto
                        y = (index * 30).toDouble(), // Espaciado vertical estimado
                        width = 200.0,
                        height = 25.0,
                        confidence = 0.7
                    )
                )
            }
        }
        
        return boxes
    }

    /**
     * Sugerencias basadas en heurísticas cuando OCR no está disponible
     */
    private fun getHeuristicSuggestions(image: BufferedImage): List<TextBox> {
        // Buscar áreas blancas grandes (posibles campos de firma)
        // Por ahora, retornar lista vacía y usar sugerencias por defecto
        return emptyList()
    }

    /**
     * Verifica si un texto coincide con patrones de firma
     */
    private fun matchesSignaturePattern(text: String): Boolean {
        return SIGNATURE_PATTERNS.any { pattern ->
            pattern.containsMatchIn(text)
        }
    }

    /**
     * Elimina sugerencias duplicadas o muy cercanas
     */
    private fun deduplicateSuggestions(suggestions: List<SignatureFieldSuggestion>): List<SignatureFieldSuggestion> {
        val result = mutableListOf<SignatureFieldSuggestion>()
        
        suggestions.forEach { suggestion ->
            val isDuplicate = result.any { existing ->
                existing.page == suggestion.page &&
                Math.abs(existing.x - suggestion.x) < 50 &&
                Math.abs(existing.y - suggestion.y) < 50
            }
            
            if (!isDuplicate) {
                result.add(suggestion)
            }
        }
        
        return result
    }

    /**
     * Sugerencias por defecto cuando no se detecta nada
     */
    private fun getDefaultSuggestions(): List<SignatureFieldSuggestion> {
        logger.info { "Usando sugerencias por defecto" }
        return listOf(
            SignatureFieldSuggestion(
                page = 1,
                x = 50.0,
                y = 600.0,
                width = DEFAULT_SIGNATURE_WIDTH,
                height = DEFAULT_SIGNATURE_HEIGHT,
                confidence = 0.5,
                detectedText = "Posición sugerida por defecto"
            )
        )
    }
}

/**
 * Caja de texto detectada por OCR
 */
data class TextBox(
    val text: String,
    val x: Double,
    val y: Double,
    val width: Double,
    val height: Double,
    val confidence: Double
)

/**
 * Sugerencia de campo de firma
 */
data class SignatureFieldSuggestion(
    val page: Int,
    val x: Double,
    val y: Double,
    val width: Double,
    val height: Double,
    val confidence: Double,
    val detectedText: String
)
