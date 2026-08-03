package com.docusing.signature.infrastructure.pdf

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
import java.time.format.DateTimeFormatter

@Component
class PDFAuditCertificate(
    private val qrCodeGenerator: QRCodeGenerator
) {
    
    private val dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")
    
    private fun sanitizeText(text: String): String {
        return text
            .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
            .replace("Á", "A").replace("É", "E").replace("Í", "I").replace("Ó", "O").replace("Ú", "U")
            .replace("ñ", "n").replace("Ñ", "N")
            .replace("ü", "u").replace("Ü", "U")
            .replace("–", "-").replace("—", "-")
            .replace(""", "\"").replace(""", "\"")
            .replace("'", "'").replace("'", "'")
            .filter { it.code in 32..126 || it == '\n' }
    }
    
    fun addAuditCertificate(
        document: PDDocument,
        signatureRequest: SignatureRequestEntity
    ) {
        var currentPage = PDPage(PDRectangle.A4)
        document.addPage(currentPage)
        var content = PDPageContentStream(document, currentPage)
        
        var yPos = 750f
            
        // Header con fondo
        content.setNonStrokingColor(Color(0, 123, 255))
        content.addRect(0f, yPos - 30f, currentPage.mediaBox.width, 60f)
        content.fill()
            
            // Título
            content.setNonStrokingColor(Color.WHITE)
            content.beginText()
            content.setFont(PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 20f)
            content.newLineAtOffset(50f, yPos)
            content.showText("CERTIFICADO DE FIRMA DIGITAL")
            content.endText()
            
            yPos -= 80f
            
            // Información del documento
            content.setNonStrokingColor(Color.BLACK)
            
            // QR Code del hash del documento (esquina superior derecha) - TAMAÑO ESTÁNDAR 90x90
            val documentHash = signatureRequest.documentHash ?: "NO_HASH"
            val qrSize = 90f
            val qrImage = qrCodeGenerator.generateQRCode(documentHash, qrSize.toInt())
            val pdImage = LosslessFactory.createFromImage(document, qrImage)
            
            val qrXPos = currentPage.mediaBox.width - 140f
            content.drawImage(pdImage, qrXPos, yPos - 95f, qrSize, qrSize)
            
            content.beginText()
            content.setFont(PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 8f)
            content.newLineAtOffset(qrXPos + 10f, yPos - 110f)
            content.showText("QR Documento")
            content.endText()
            
            // Título del documento
            content.beginText()
            content.setFont(PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 11f)
            content.newLineAtOffset(50f, yPos)
            content.showText("Documento:")
            content.endText()
            
            yPos -= 18f
            content.beginText()
            content.setFont(PDType1Font(Standard14Fonts.FontName.HELVETICA), 11f)
            content.newLineAtOffset(50f, yPos)
            content.showText(sanitizeText(signatureRequest.title))
            content.endText()
            
            // Estado
            yPos -= 25f
            val completedAt = signatureRequest.completedAt
            val statusText = if (completedAt != null) {
                val completedDate = dateFormatter.format(
                    completedAt.atZone(java.time.ZoneId.of("America/Santiago")).toLocalDateTime()
                )
                "Completado - $completedDate"
            } else {
                val status = signatureRequest.status.name
                when (status) {
                    "COMPLETED" -> "Completado"
                    "IN_PROGRESS" -> "En progreso"
                    "PENDING" -> "Pendiente"
                    "CANCELLED" -> "Cancelado"
                    "EXPIRED" -> "Expirado"
                    else -> status
                }
            }
            content.beginText()
            content.setFont(PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 11f)
            content.newLineAtOffset(50f, yPos)
            content.showText("Estado:")
            content.endText()
            
            yPos -= 18f
            content.beginText()
            content.setFont(PDType1Font(Standard14Fonts.FontName.HELVETICA), 11f)
            content.newLineAtOffset(50f, yPos)
            content.showText(statusText)
            content.endText()
            
            // Mostrar hash si existe
            if (documentHash != "NO_HASH") {
                yPos -= 25f
                content.beginText()
                content.setFont(PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 10f)
                content.newLineAtOffset(50f, yPos)
                content.showText("Hash SHA-256:")
                content.endText()
                
                yPos -= 15f
                content.beginText()
                content.setFont(PDType1Font(Standard14Fonts.FontName.COURIER), 7f)
                content.newLineAtOffset(50f, yPos)
                content.showText(documentHash)
                content.endText()
                
                yPos -= 20f
            } else {
                yPos -= 20f
            }
            
            // Separador
            yPos -= 10f
            content.setStrokingColor(Color.LIGHT_GRAY)
            content.setLineWidth(1f)
            content.moveTo(50f, yPos)
            content.lineTo(currentPage.mediaBox.width - 50f, yPos)
            content.stroke()
            
            // Firmantes
            yPos -= 25f
            content.setNonStrokingColor(Color.BLACK)
            content.beginText()
            content.setFont(PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 11f)
            content.newLineAtOffset(50f, yPos)
            content.showText("Registro de Firmantes")
            content.endText()
            
            yPos -= 30f
            
            // Tabla de firmantes - COMPACTA CON QR
            signatureRequest.signers.sortedBy { it.orderIndex }.forEach { signer ->
                // Verificar si hay espacio suficiente, si no crear nueva página
                if (yPos < 150f) {
                    // Cerrar página actual
                    content.close()
                    
                    // Crear nueva página
                    currentPage = PDPage(PDRectangle.A4)
                    document.addPage(currentPage)
                    content = PDPageContentStream(document, currentPage)
                    yPos = 750f
                    
                    // Header en nueva página
                    content.setNonStrokingColor(Color(0, 123, 255))
                    content.addRect(0f, yPos - 30f, currentPage.mediaBox.width, 60f)
                    content.fill()
                    
                    content.setNonStrokingColor(Color.WHITE)
                    content.beginText()
                    content.setFont(PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 20f)
                    content.newLineAtOffset(50f, yPos)
                    content.showText("CERTIFICADO DE FIRMA DIGITAL (cont.)")
                    content.endText()
                    
                    yPos -= 80f
                }
                
                // Línea separadora
                content.setStrokingColor(Color.LIGHT_GRAY)
                content.moveTo(50f, yPos)
                content.lineTo(currentPage.mediaBox.width - 50f, yPos)
                content.stroke()
                
                yPos -= 20f
                
                // Información del firmante en formato compacto y alineado
                content.setNonStrokingColor(Color.BLACK)
                
                // Nombre y email del firmante
                content.beginText()
                content.setFont(PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 11f)
                content.newLineAtOffset(50f, yPos)
                content.showText("${signer.orderIndex + 1}. ${sanitizeText(signer.fullName)}")
                content.endText()
                
                yPos -= 15f
                content.beginText()
                content.setFont(PDType1Font(Standard14Fonts.FontName.HELVETICA), 9f)
                content.newLineAtOffset(70f, yPos)
                content.showText("Email: ${sanitizeText(signer.email)}")
                content.endText()
                
                yPos -= 15f
                
                // Fecha y método en líneas separadas para mejor legibilidad
                val signedDate = signer.signedAt?.let {
                    dateFormatter.format(it.atZone(java.time.ZoneId.of("America/Santiago")).toLocalDateTime())
                } ?: "Pendiente"
                val authMethod = signer.authenticationMethod ?: "N/A"
                
                content.beginText()
                content.setFont(PDType1Font(Standard14Fonts.FontName.HELVETICA), 9f)
                content.newLineAtOffset(70f, yPos)
                content.showText("Fecha: $signedDate")
                content.endText()
                
                yPos -= 12f
                content.beginText()
                content.setFont(PDType1Font(Standard14Fonts.FontName.HELVETICA), 9f)
                content.newLineAtOffset(70f, yPos)
                content.showText("Método: $authMethod")
                content.endText()
                
                // QR Code con información del firmante - TAMAÑO ESTÁNDAR 90x90
                val signerInfo = buildString {
                    append("Firmante: ${signer.fullName}\n")
                    append("Email: ${signer.email}\n")
                    append("Fecha: $signedDate\n")
                    append("Método: $authMethod\n")
                    append("IP: ${signer.signerIpAddress ?: "N/A"}\n")
                    append("ID: ${signer.id}")
                }
                
                val signerQrSize = 90f
                val signerQrImage = qrCodeGenerator.generateQRCode(signerInfo, signerQrSize.toInt())
                val signerPdImage = LosslessFactory.createFromImage(document, signerQrImage)
                
                // Posicionar QR alineado con el QR del documento
                val signerQrXPos = currentPage.mediaBox.width - 140f
                yPos -= 95f
                content.drawImage(signerPdImage, signerQrXPos, yPos, signerQrSize, signerQrSize)
                
                content.beginText()
                content.setFont(PDType1Font(Standard14Fonts.FontName.HELVETICA), 7f)
                content.newLineAtOffset(signerQrXPos + 10f, yPos - 10f)
                content.showText("Info firmante")
                content.endText()
                
                yPos -= 15f
            }
            
            // Footer
            if (yPos > 100f) {
                content.setNonStrokingColor(Color.GRAY)
                content.beginText()
                content.setFont(PDType1Font(Standard14Fonts.FontName.HELVETICA), 8f)
                content.newLineAtOffset(50f, 50f)
                content.showText("Este certificado fue generado automáticamente por el sistema Docusing")
                content.endText()
                
                content.beginText()
                content.newLineAtOffset(50f, 40f)
                content.showText("Verificación de integridad disponible mediante hash SHA-256")
                content.endText()
            }
            
            // Cerrar el último content stream
            content.close()
    }
}
