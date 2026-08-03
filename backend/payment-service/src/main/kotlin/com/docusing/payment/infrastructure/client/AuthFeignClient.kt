package com.docusing.payment.infrastructure.client

import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import java.util.UUID

@FeignClient(
    name = "auth-service",
    url = "\${auth.service.base-url}"
)
interface AuthFeignClient {

    @GetMapping("/api/users/{userId}")
    fun getUserById(
        @PathVariable userId: UUID
    ): UserResponse
}

data class UserResponse(
    val id: String,
    val email: String,
    val fullName: String
)
