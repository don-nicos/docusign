package com.docusing.document.apis.client

import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestHeader
import java.util.UUID

@FeignClient(name = "auth-service", url = "\${auth.service.base-url:http://localhost:8081}")
interface AuthFeignClient {

    @GetMapping("/api/organizations/{organizationId}/my-role")
    fun getMyRole(
        @PathVariable organizationId: UUID,
        @RequestHeader("X-User-Id") userId: String
    ): Map<String, String?>
}
