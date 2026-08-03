package com.docusing.auth.infrastructure.client

import org.springframework.cloud.openfeign.FeignClient
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody

@FeignClient(
    name = "notification-service",
    url = "\${notification.service.base-url}"
)
interface NotificationFeignClient {

    @PostMapping("/notifications/magic-link")
    fun sendMagicLinkEmail(@RequestBody request: MagicLinkEmailRequest): ResponseEntity<Void>
}

data class MagicLinkEmailRequest(
    val email: String,
    val fullName: String? = null,
    val magicLinkUrl: String
)
