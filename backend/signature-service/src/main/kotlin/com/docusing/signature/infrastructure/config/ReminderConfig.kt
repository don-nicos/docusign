package com.docusing.signature.infrastructure.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.context.annotation.Configuration

@Configuration
@ConfigurationProperties(prefix = "signature.reminders")
class ReminderConfig {
    /**
     * Días de espera antes de enviar el primer recordatorio
     */
    var daysBeforeFirstReminder: Int = 3

    /**
     * Días entre recordatorios subsecuentes
     */
    var daysBetweenReminders: Int = 2

    /**
     * Número máximo de recordatorios a enviar
     */
    var maxReminders: Int = 5

    /**
     * Habilitar/deshabilitar recordatorios automáticos
     */
    var enabled: Boolean = true

    /**
     * Cron expression para el job de recordatorios
     * Default: Todos los días a las 9:00 AM
     */
    var cronExpression: String = "0 0 9 * * ?"
}
