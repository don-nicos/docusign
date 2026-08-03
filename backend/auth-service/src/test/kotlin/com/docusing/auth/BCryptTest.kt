package com.docusing.auth

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder

fun main() {
    val encoder = BCryptPasswordEncoder()
    val password = "Test1234!"
    val storedHash = "\$2a\$10\$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WrxJgccpkRJLWPCQvGIa"
    
    println("Password: $password")
    println("Stored Hash: $storedHash")
    println("Match result: ${encoder.matches(password, storedHash)}")
    
    // Generar un nuevo hash para comparar
    val newHash = encoder.encode(password)
    println("New Hash: $newHash")
    println("New hash matches password: ${encoder.matches(password, newHash)}")
}
