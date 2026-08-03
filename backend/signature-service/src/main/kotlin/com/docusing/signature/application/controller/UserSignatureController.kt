package com.docusing.signature.application.controller

import com.docusing.signature.common.dto.response.UserSignatureResponse
import com.docusing.signature.common.dto.response.MessageResponse
import com.docusing.signature.core.service.UserSignatureService
import com.docusing.signature.common.web.ApiHeaders
import com.docusing.signature.common.web.ApiRoutes
import mu.KotlinLogging
import org.springframework.core.io.Resource
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import java.util.UUID

private val logger = KotlinLogging.logger {}

@RestController
@RequestMapping(ApiRoutes.UserSignatures.BASE)
class UserSignatureController(
    private val userSignatureService: UserSignatureService
) {

    @GetMapping(ApiRoutes.UserSignatures.LIST)
    fun getUserSignatures(
        @RequestHeader(ApiHeaders.USER_ID) userId: String
    ): List<UserSignatureResponse> {
        val userUuid = UUID.fromString(userId)
        val signatures = userSignatureService.getUserSignatures(userUuid)
        return signatures.map {
            UserSignatureResponse(
                id = it.id!!,
                userId = it.userId,
                signatureImagePath = it.signatureImagePath,
                name = it.name,
                isDefault = it.isDefault,
                createdAt = it.createdAt!!
            )
        }
    }

    @PostMapping(ApiRoutes.UserSignatures.CREATE, consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    @ResponseStatus(HttpStatus.CREATED)
    fun saveUserSignature(
        @RequestHeader(ApiHeaders.USER_ID) userId: String,
        @RequestParam("signature") signatureImage: MultipartFile,
        @RequestParam("name", required = false) name: String?,
        @RequestParam("setAsDefault", defaultValue = "false") setAsDefault: Boolean
    ): UserSignatureResponse {
        val userUuid = UUID.fromString(userId)
        val saved = userSignatureService.saveUserSignature(userUuid, signatureImage, name, setAsDefault)
        logger.info { "Signature saved for user $userId" }
        return UserSignatureResponse(
            id = saved.id!!,
            userId = saved.userId,
            signatureImagePath = saved.signatureImagePath,
            name = saved.name,
            isDefault = saved.isDefault,
            createdAt = saved.createdAt!!
        )
    }

    @DeleteMapping(ApiRoutes.UserSignatures.DELETE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteUserSignature(
        @RequestHeader(ApiHeaders.USER_ID) userId: String,
        @PathVariable signatureId: UUID
    ) {
        val userUuid = UUID.fromString(userId)
        userSignatureService.deleteUserSignature(userUuid, signatureId)
        logger.info { "Signature $signatureId deleted for user $userId" }
    }

    @PutMapping(ApiRoutes.UserSignatures.SET_DEFAULT)
    fun setDefaultSignature(
        @RequestHeader(ApiHeaders.USER_ID) userId: String,
        @PathVariable signatureId: UUID
    ): MessageResponse {
        val userUuid = UUID.fromString(userId)
        userSignatureService.setDefaultSignature(userUuid, signatureId)
        return MessageResponse("Signature set as default")
    }
}
