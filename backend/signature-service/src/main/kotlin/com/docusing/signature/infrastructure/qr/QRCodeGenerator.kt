package com.docusing.signature.infrastructure.qr

import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel
import org.springframework.stereotype.Component
import java.awt.Color
import java.awt.image.BufferedImage

@Component
class QRCodeGenerator {

    companion object {
        private const val QUIET_ZONE_MODULES = 1
        private const val MODULES_PER_VERSION = 4
        private const val FIXED_MODULES = 17
    }

    /**
     * Genera un código QR como BufferedImage.
     * @param content Contenido del QR
     * @param size Tamaño en píxeles (ancho y alto)
     * @param version Versión QR exacta a usar (opcional). Si es null se selecciona automáticamente.
     * @return BufferedImage con el código QR
     */
    fun generateQRCode(content: String, size: Int = 150, version: Int? = null): BufferedImage {
        val hints = mutableMapOf<EncodeHintType, Any>(
            EncodeHintType.ERROR_CORRECTION to ErrorCorrectionLevel.M,
            EncodeHintType.MARGIN to QUIET_ZONE_MODULES
        )
        if (version != null) {
            hints[EncodeHintType.QR_VERSION] = version
        }

        val qrCodeWriter = QRCodeWriter()
        val bitMatrix = qrCodeWriter.encode(content, BarcodeFormat.QR_CODE, size, size, hints)

        val image = BufferedImage(bitMatrix.width, bitMatrix.height, BufferedImage.TYPE_INT_RGB)
        for (x in 0 until bitMatrix.width) {
            for (y in 0 until bitMatrix.height) {
                image.setRGB(x, y, if (bitMatrix[x, y]) Color.BLACK.rgb else Color.WHITE.rgb)
            }
        }
        return image
    }

    /**
     * Devuelve la versión QR mínima necesaria para el contenido dado.
     * Se codifica con tamaño 0 para obtener las dimensiones reales del QR
     * (sin escalado) y se deriva la versión a partir del ancho total.
     */
    fun minVersionFor(content: String): Int {
        val hints = mapOf(
            EncodeHintType.ERROR_CORRECTION to ErrorCorrectionLevel.M,
            EncodeHintType.MARGIN to QUIET_ZONE_MODULES
        )
        val bitMatrix = QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, 0, 0, hints)
        val dimension = bitMatrix.width
        return (dimension - FIXED_MODULES - 2 * QUIET_ZONE_MODULES) / MODULES_PER_VERSION
    }
}
