package com.docusing.signature.apis.client

import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestHeader
import java.util.UUID
import com.docusing.signature.common.web.ApiHeaders
import com.docusing.signature.common.web.ExternalRoutes

@FeignClient(name = "auth-service", url = "\${auth.service.base-url:http://localhost:8081}")
interface AuthFeignClient {

    @GetMapping(ExternalRoutes.Auth.GET_MY_ROLE)
    fun getMyRole(
        @PathVariable organizationId: UUID,
        @RequestHeader(ApiHeaders.USER_ID) userId: String
    ): Map<String, String?>

    @GetMapping(ExternalRoutes.Auth.GET_USER)
    fun getUserById(@PathVariable("userId") userId: UUID): Map<String, Any?>
}
