package com.docusing.notification.service

import mu.KotlinLogging
import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.stereotype.Service
import java.time.Instant

private val logger = KotlinLogging.logger {}

@Service
class EmailService(
    private val mailSender: JavaMailSender
) {

    fun sendMagicLinkEmail(email: String, fullName: String?, magicLinkUrl: String) {
        logger.info { " Enviando Magic Link a: $email" }
        
        val name = fullName ?: "Usuario"
        
        try {
            val message = SimpleMailMessage().apply {
                from = "noreply@docusing.com"
                setTo(email)
                subject = " Tu enlace de acceso a Docusing"
                text = """
                    Hola $name,
                    
                    Has solicitado acceso a Docusing. Haz clic en el siguiente enlace para iniciar sesión:
                    
                    $magicLinkUrl
                    
                    Este enlace es válido por 10 minutos.
                    
                    Si no solicitaste este enlace, puedes ignorar este correo de forma segura.
                    
                    ---
                    Docusing - Firma Electrónica Simple para Chile
                """.trimIndent()
            }
            
            mailSender.send(message)
            logger.info { " Magic Link enviado exitosamente a: $email" }
        } catch (e: Exception) {
            logger.error(e) { " Error al enviar Magic Link a: $email" }
            throw e
        }
    }

    fun sendOtpEmail(email: String, fullName: String?, otp: String, documentTitle: String) {
        logger.info { " Enviando OTP a: $email para documento: $documentTitle" }
        
        val name = fullName ?: "Usuario"
        
        try {
            val message = SimpleMailMessage().apply {
                from = "noreply@docusing.com"
                setTo(email)
                subject = " Código de verificación para firma - Docusing"
                text = """
                    Hola $name,
                    
                    Has recibido una solicitud para firmar el documento:
                    "$documentTitle"
                    
                    Tu código de verificación es:
                    
                    $otp
                    
                    Este código es válido por 10 minutos.
                    
                    Si no esperabas este correo, por favor ignóralo.
                    
                    ---
                    Docusing - Firma Electrónica Simple para Chile
                """.trimIndent()
            }
            
            mailSender.send(message)
            logger.info { " OTP enviado exitosamente a: $email" }
        } catch (e: Exception) {
            logger.error(e) { " Error al enviar OTP a: $email" }
            throw e
        }
    }

    fun sendSignatureCompletedEmail(email: String, documentTitle: String) {
        logger.info { " Enviando notificación de firma completada a: $email" }
        
        try {
            val message = SimpleMailMessage().apply {
                from = "noreply@docusing.com"
                setTo(email)
                subject = " Documento firmado exitosamente - Docusing"
                text = """
                    Tu firma ha sido registrada exitosamente en el documento:
                    "$documentTitle"
                    
                    Puedes ver el estado del documento en tu panel de Docusing.
                    
                    ---
                    Docusing - Firma Electrónica Simple para Chile
                """.trimIndent()
            }
            
            mailSender.send(message)
            logger.info { " Notificación de firma completada enviada a: $email" }
        } catch (e: Exception) {
            logger.error(e) { " Error al enviar notificación a: $email" }
            throw e
        }
    }

    fun sendSubscriptionExpiringEmail(
        email: String,
        fullName: String?,
        planName: String,
        currentPeriodEnd: Instant,
        daysBeforeExpiry: Int
    ) {
        logger.info { " Enviando recordatorio de suscripción por vencer a: $email" }

        val name = fullName ?: "Usuario"

        try {
            val message = SimpleMailMessage().apply {
                from = "noreply@docusing.com"
                setTo(email)
                subject = " Tu suscripción está por vencer - Docusing"
                text = """
                    Hola $name,

                    Tu suscripción ($planName) vence en $daysBeforeExpiry día(s).

                    Fecha de vencimiento: $currentPeriodEnd

                    Para evitar interrupciones, asegúrate de tener tu suscripción activa.

                    ---
                    Docusing - Firma Electrónica Simple para Chile
                """.trimIndent()
            }

            mailSender.send(message)
            logger.info { " Recordatorio de suscripción enviado exitosamente a: $email" }
        } catch (e: Exception) {
            logger.error(e) { " Error al enviar recordatorio de suscripción a: $email" }
            throw e
        }
    }
}
