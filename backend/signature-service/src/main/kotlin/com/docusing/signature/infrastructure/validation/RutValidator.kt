package com.docusing.signature.infrastructure.validation

import org.springframework.stereotype.Component

/**
 * Validador de RUT chileno según algoritmo oficial
 * El RUT chileno tiene formato: XX.XXX.XXX-X donde el último dígito es el verificador
 */
@Component
class RutValidator {

    /**
     * Valida un RUT chileno
     * @param rut RUT en formato "12345678-9" o "12.345.678-9" o "12345678-K"
     * @return true si el RUT es válido
     */
    fun isValid(rut: String?): Boolean {
        if (rut.isNullOrBlank()) return false

        try {
            // Limpiar el RUT (quitar puntos y guiones)
            val cleanRut = rut.replace(".", "").replace("-", "").trim().uppercase()
            
            if (cleanRut.length < 2) return false

            // Separar número y dígito verificador
            val rutNumber = cleanRut.substring(0, cleanRut.length - 1)
            val dv = cleanRut.substring(cleanRut.length - 1)

            // Validar que el número sea numérico
            if (!rutNumber.all { it.isDigit() }) return false
            
            // Validar longitud razonable del RUT (máximo 9 dígitos para el número)
            if (rutNumber.length > 9) return false

            // Calcular dígito verificador
            val rutNumberInt = rutNumber.toIntOrNull() ?: return false
            val calculatedDv = calculateDv(rutNumberInt)

            return dv == calculatedDv
        } catch (e: Exception) {
            return false
        }
    }

    /**
     * Calcula el dígito verificador de un RUT
     * @param rutNumber Número del RUT sin dígito verificador
     * @return Dígito verificador calculado
     */
    fun calculateDv(rutNumber: Int): String {
        var sum = 0
        var multiplier = 2
        var num = rutNumber

        // Algoritmo de cálculo del dígito verificador
        while (num > 0) {
            sum += (num % 10) * multiplier
            num /= 10
            multiplier = if (multiplier == 7) 2 else multiplier + 1
        }

        val remainder = sum % 11
        val dv = 11 - remainder

        return when (dv) {
            11 -> "0"
            10 -> "K"
            else -> dv.toString()
        }
    }

    /**
     * Formatea un RUT al formato estándar chileno XX.XXX.XXX-X
     * @param rut RUT sin formato
     * @return RUT formateado
     */
    fun format(rut: String): String {
        val cleanRut = rut.replace(".", "").replace("-", "").trim().uppercase()
        
        if (cleanRut.length < 2) return rut

        val rutNumber = cleanRut.substring(0, cleanRut.length - 1)
        val dv = cleanRut.substring(cleanRut.length - 1)

        // Formatear con puntos
        val formatted = StringBuilder()
        var count = 0
        
        for (i in rutNumber.length - 1 downTo 0) {
            if (count > 0 && count % 3 == 0) {
                formatted.insert(0, ".")
            }
            formatted.insert(0, rutNumber[i])
            count++
        }

        return "$formatted-$dv"
    }

    /**
     * Limpia un RUT dejando solo números y dígito verificador
     * @param rut RUT con o sin formato
     * @return RUT limpio (sin puntos ni guiones)
     */
    fun clean(rut: String): String {
        return rut.replace(".", "").replace("-", "").trim().uppercase()
    }
}
