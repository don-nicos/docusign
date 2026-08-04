package com.docusing.signature.infrastructure.pdf

import com.docusing.signature.config.FrontendProperties
import com.docusing.signature.domain.model.SignatureRequestEntity
import com.docusing.signature.infrastructure.qr.QRCodeGenerator
import org.apache.pdfbox.pdmodel.PDDocument
import org.apache.pdfbox.pdmodel.PDPage
import org.apache.pdfbox.pdmodel.PDPageContentStream
import org.apache.pdfbox.pdmodel.common.PDRectangle
import org.apache.pdfbox.pdmodel.font.PDType1Font
import org.apache.pdfbox.pdmodel.font.Standard14Fonts
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory
import org.springframework.stereotype.Component
import java.awt.Color
import java.io.ByteArrayOutputStream
import java.security.MessageDigest
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private const val MARGIN_LEFT = 50f
private const val MARGIN_RIGHT = 50f
private const val MARGIN_TOP = 770f
private const val MARGIN_BOTTOM = 70f
private const val CONTENT_WIDTH = 495f // A4 (595) - 50 - 50
private const val QR_SIZE = 90f
private const val QR_PIXELS_PER_MODULE = 4
private const val SIGNER_BLOCK_MIN_HEIGHT = 180f
private const val FOOTER_HEIGHT = 50f
private const val QR_QUIET_ZONE_MODULES = 1
private const val QR_FIXED_MODULES = 17
private const val QR_MODULES_PER_VERSION = 4

@Component
class PDFAuditCertificate(
    private val qrCodeGenerator: QRCodeGenerator,
    private val frontendProperties: FrontendProperties
) {

    private val dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")
    private val headerFont = PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD)
    private val labelFont = PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD)
    private val valueFont = PDType1Font(Standard14Fonts.FontName.HELVETICA)
    private val monoFont = PDType1Font(Standard14Fonts.FontName.COURIER)

    private fun buildVerificationUrl(requestId: String, signerId: String? = null): String {
        val base = frontendProperties.baseUrl.trimEnd('/')
        return if (signerId.isNullOrBlank()) {
            "$base/validar?rid=$requestId"
        } else {
            "$base/validar?rid=$requestId&sid=$signerId"
        }
    }

    private fun sanitizeText(text: String?): String {
        if (text.isNullOrBlank()) return ""
        return text
            .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
            .replace("Á", "A").replace("É", "E").replace("Í", "I").replace("Ó", "O").replace("Ú", "U")
            .replace("ñ", "n").replace("Ñ", "N")
            .replace("ü", "u").replace("Ü", "U")
            .replace("–", "-").replace("—", "-")
            .replace("“", "\"").replace("”", "\"")
            .replace("‘", "'").replace("’", "'")
            .filter { it.code in 32..126 || it == '\n' }
    }

    private fun stringWidth(text: String, font: PDType1Font, fontSize: Float): Float {
        return font.getStringWidth(sanitizeText(text)) / 1000 * fontSize
    }

    private fun computeDocumentHash(document: PDDocument): String {
        val baos = ByteArrayOutputStream()
        document.save(baos)
        val digest = MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest(baos.toByteArray())
        return hashBytes.joinToString("") { "%02x".format(it) }
    }

    private fun drawTextLine(
        content: PDPageContentStream,
        text: String,
        x: Float,
        y: Float,
        font: PDType1Font,
        fontSize: Float,
        color: Color = Color.BLACK
    ) {
        if (text.isBlank()) return
        val sanitized = sanitizeText(text)
        content.setNonStrokingColor(color)
        content.beginText()
        content.setFont(font, fontSize)
        content.newLineAtOffset(x, y)
        content.showText(sanitized)
        content.endText()
    }

    /**
     * Dibuja texto envuelto en líneas. Retorna la nueva posición Y (baseline de la siguiente línea).
     */
    private fun drawWrappedText(
        content: PDPageContentStream,
        text: String,
        x: Float,
        y: Float,
        maxWidth: Float,
        font: PDType1Font,
        fontSize: Float,
        lineHeight: Float,
        color: Color = Color.BLACK
    ): Float {
        val sanitized = sanitizeText(text)
        if (sanitized.isBlank()) return y - lineHeight

        val words = sanitized.split(Regex("\\s+")).filter { it.isNotBlank() }
        var currentLine = StringBuilder()
        var currentY = y

        content.setNonStrokingColor(color)

        words.forEach { word ->
            val candidate = if (currentLine.isEmpty()) word else "$currentLine $word"
            if (stringWidth(candidate, font, fontSize) <= maxWidth) {
                currentLine.append(if (currentLine.isEmpty()) word else " $word")
            } else {
                if (currentLine.isNotEmpty()) {
                    drawSingleLine(content, currentLine.toString(), x, currentY, font, fontSize)
                    currentY -= lineHeight
                }
                currentLine = StringBuilder(word)
            }
        }

        if (currentLine.isNotBlank()) {
            drawSingleLine(content, currentLine.toString(), x, currentY, font, fontSize)
            currentY -= lineHeight
        }

        return currentY
    }

    private fun drawSingleLine(
        content: PDPageContentStream,
        text: String,
        x: Float,
        y: Float,
        font: PDType1Font,
        fontSize: Float
    ) {
        content.beginText()
        content.setFont(font, fontSize)
        content.newLineAtOffset(x, y)
        content.showText(sanitizeText(text))
        content.endText()
    }

    private fun drawQRCode(
        document: PDDocument,
        content: PDPageContentStream,
        text: String,
        x: Float,
        y: Float,
        size: Float,
        version: Int,
        imageSize: Int
    ) {
        if (text.isBlank()) return
        val qrImage = qrCodeGenerator.generateQRCode(text, imageSize, version)
        val pdImage = LosslessFactory.createFromImage(document, qrImage)
        content.drawImage(pdImage, x, y, size, size)
    }

    private fun drawHeader(content: PDPageContentStream, page: PDPage, continuation: Boolean) {
        // Fondo azul
        content.setNonStrokingColor(Color(0, 123, 255))
        content.addRect(0f, MARGIN_TOP - 30f, page.mediaBox.width, 60f)
        content.fill()

        // Título
        val title = if (continuation) "CERTIFICADO DE FIRMA DIGITAL (cont.)" else "CERTIFICADO DE FIRMA DIGITAL"
        content.setNonStrokingColor(Color.WHITE)
        content.beginText()
        content.setFont(headerFont, 20f)
        val titleWidth = stringWidth(title, headerFont, 20f)
        content.newLineAtOffset((page.mediaBox.width - titleWidth) / 2, MARGIN_TOP)
        content.showText(title)
        content.endText()
    }

    private fun newCertificatePage(document: PDDocument, continuation: Boolean): Pair<PDPage, PDPageContentStream> {
        val page = PDPage(PDRectangle.A4)
        document.addPage(page)
        val content = PDPageContentStream(document, page, PDPageContentStream.AppendMode.OVERWRITE, true, true)
        drawHeader(content, page, continuation)
        return page to content
    }

    fun addAuditCertificate(
        document: PDDocument,
        signatureRequest: SignatureRequestEntity
    ) {
        // Calcular el hash del documento firmado (sin la página de certificado)
        // y persistirlo para que coincida con el mostrado en el certificado.
        val documentHash = if (signatureRequest.documentHash.isNullOrBlank()) {
            val hash = computeDocumentHash(document)
            signatureRequest.documentHash = hash
            hash
        } else {
            signatureRequest.documentHash!!
        }

        // Recolectar todos los contenidos de los QR para usar la misma versión (y por tanto el mismo tamaño).
        val requestId = signatureRequest.id?.toString() ?: ""
        val documentQrContent = if (requestId.isNotBlank()) buildVerificationUrl(requestId) else ""

        val signers = signatureRequest.signers.orEmpty().sortedBy { it.orderIndex }
        val signerQrContents = signers.map { signer ->
            if (requestId.isNotBlank() && signer.id != null) {
                buildVerificationUrl(requestId, signer.id.toString())
            } else {
                ""
            }
        }

        val allQrContents = mutableListOf<String>()
        if (documentQrContent.isNotBlank()) {
            allQrContents.add(documentQrContent)
        }
        allQrContents.addAll(signerQrContents.filter { it.isNotBlank() })

        val maxQrVersion = allQrContents
            .maxOfOrNull { qrCodeGenerator.minVersionFor(it) }
            ?.coerceAtLeast(1) ?: 1
        val qrModules = QR_FIXED_MODULES + QR_MODULES_PER_VERSION * maxQrVersion + 2 * QR_QUIET_ZONE_MODULES
        val qrImageSize = qrModules * QR_PIXELS_PER_MODULE

        var (currentPage, content) = newCertificatePage(document, false)

        val documentTitle = sanitizeText(signatureRequest.title)
        val statusText = buildStatusText(signatureRequest)

        // Área de info del documento (izquierda) y QR (derecha)
        var yPos = MARGIN_TOP - 80f
        val qrX = currentPage.mediaBox.width - MARGIN_RIGHT - QR_SIZE
        val textMaxWidth = CONTENT_WIDTH - QR_SIZE - 30f

        // Título del documento
        drawTextLine(content, "Documento:", MARGIN_LEFT, yPos, labelFont, 11f)
        yPos = drawWrappedText(content, documentTitle, MARGIN_LEFT + 10f, yPos - 18f, textMaxWidth, valueFont, 11f, 14f)

        // Estado
        drawTextLine(content, "Estado:", MARGIN_LEFT, yPos - 10f, labelFont, 11f)
        yPos = drawWrappedText(content, statusText, MARGIN_LEFT + 10f, yPos - 28f, textMaxWidth, valueFont, 11f, 14f)

        // Hash SHA-256
        if (documentHash != "NO_HASH") {
            drawTextLine(content, "Hash SHA-256:", MARGIN_LEFT, yPos - 10f, labelFont, 10f)
            yPos = drawWrappedText(content, documentHash, MARGIN_LEFT, yPos - 28f, textMaxWidth, monoFont, 7f, 10f)
            yPos -= 5f
        } else {
            yPos -= 15f
        }

        // QR del documento alineado a la derecha, con su borde superior alineado al texto "Documento:"
        val documentQrTop = MARGIN_TOP - 70f
        if (documentQrContent.isNotBlank()) {
            drawQRCode(document, content, documentQrContent, qrX, documentQrTop - QR_SIZE, QR_SIZE, maxQrVersion, qrImageSize)
        }

        // Separador
        yPos -= 15f
        content.setStrokingColor(Color.LIGHT_GRAY)
        content.setLineWidth(1f)
        content.moveTo(MARGIN_LEFT, yPos)
        content.lineTo(currentPage.mediaBox.width - MARGIN_RIGHT, yPos)
        content.stroke()

        // Título de firmantes
        yPos -= 25f
        drawTextLine(content, "Registro de Firmantes", MARGIN_LEFT, yPos, labelFont, 14f)
        yPos -= 30f

        signers.forEachIndexed { index, signer ->
            val signerInfo = signerQrContents[index]

            // Asegurar espacio suficiente antes de dibujar el bloque
            if (yPos - SIGNER_BLOCK_MIN_HEIGHT < MARGIN_BOTTOM + FOOTER_HEIGHT) {
                content.close()
                val next = newCertificatePage(document, true)
                currentPage = next.first
                content = next.second
                yPos = MARGIN_TOP - 80f
            }

            val blockStartY = yPos

            // Línea separadora
            content.setStrokingColor(Color.LIGHT_GRAY)
            content.setLineWidth(1f)
            content.moveTo(MARGIN_LEFT, yPos)
            content.lineTo(currentPage.mediaBox.width - MARGIN_RIGHT, yPos)
            content.stroke()

            // QR del firmante alineado a la derecha, con su borde superior alineado al nombre del firmante
            val signerQrTop = blockStartY - 4f
            drawQRCode(document, content, signerInfo, qrX, signerQrTop - QR_SIZE, QR_SIZE, maxQrVersion, qrImageSize)

            yPos = blockStartY - 12f

            val signedDate = signer.signedAt?.let {
                dateFormatter.format(it.atZone(ZoneId.of("America/Santiago")).toLocalDateTime())
            } ?: "Pendiente"
            val authMethod = signer.authenticationMethod ?: "N/A"

            // Información del firmante (izquierda)
            val signerTextMaxWidth = CONTENT_WIDTH - QR_SIZE - 30f
            val nameText = "${signer.orderIndex + 1}. ${signer.fullName}"
            yPos = drawWrappedText(content, nameText, MARGIN_LEFT, yPos, signerTextMaxWidth, labelFont, 11f, 16f)

            yPos = drawWrappedText(content, "Email: ${signer.email}", MARGIN_LEFT + 15f, yPos, signerTextMaxWidth, valueFont, 9f, 13f)
            yPos = drawWrappedText(content, "Fecha: $signedDate", MARGIN_LEFT + 15f, yPos, signerTextMaxWidth, valueFont, 9f, 13f)
            yPos = drawWrappedText(content, "Método: $authMethod", MARGIN_LEFT + 15f, yPos, signerTextMaxWidth, valueFont, 9f, 13f)

            // Dejar espacio proporcional al bloque dibujado, con un mínimo razonable
            val blockBottom = yPos - 10f
            val blockHeight = kotlin.math.max(SIGNER_BLOCK_MIN_HEIGHT, blockStartY - blockBottom + 20f)
            yPos = blockStartY - blockHeight
        }

        // Footer si hay espacio
        if (yPos > MARGIN_BOTTOM + FOOTER_HEIGHT) {
            content.setNonStrokingColor(Color.GRAY)
            drawTextLine(content, "Este certificado fue generado automáticamente por el sistema Docusing",
                MARGIN_LEFT, MARGIN_BOTTOM + 20f, valueFont, 8f, Color.GRAY)
            drawTextLine(content, "Verificación de integridad disponible mediante hash SHA-256",
                MARGIN_LEFT, MARGIN_BOTTOM + 8f, valueFont, 8f, Color.GRAY)
        }

        content.close()
    }

    private fun buildStatusText(signatureRequest: SignatureRequestEntity): String {
        val completedAt = signatureRequest.completedAt
        return if (completedAt != null) {
            val completedDate = dateFormatter.format(
                completedAt.atZone(ZoneId.of("America/Santiago")).toLocalDateTime()
            )
            "Completado - $completedDate"
        } else {
            when (signatureRequest.status.name) {
                "COMPLETED" -> "Completado"
                "IN_PROGRESS" -> "En progreso"
                "PENDING" -> "Pendiente"
                "CANCELLED" -> "Cancelado"
                "EXPIRED" -> "Expirado"
                else -> signatureRequest.status.name
            }
        }
    }
}
