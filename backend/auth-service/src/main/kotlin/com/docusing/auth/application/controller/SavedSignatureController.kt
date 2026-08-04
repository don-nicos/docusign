package com.docusing.auth.application.controller

import com.docusing.auth.common.dto.request.*
import com.docusing.auth.common.dto.response.*
import com.docusing.auth.core.service.SavedSignatureService
import com.docusing.auth.infrastructure.security.AuthenticatedUser
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/signatures/saved")
class SavedSignatureController(
    private val savedSignatureService: SavedSignatureService
) {
    @GetMapping
    fun getUserSignatures(
        @AuthenticationPrincipal user: AuthenticatedUser?
    ): ResponseEntity<List<SavedSignatureResponse>> {
        if (user == null) {
            return ResponseEntity.ok(emptyList())
        }
        val signatures = savedSignatureService.getUserSignatures(user.userId)
        return ResponseEntity.ok(signatures)
    }

    @GetMapping("/default")
    fun getDefaultSignature(
        @AuthenticationPrincipal user: AuthenticatedUser?
    ): ResponseEntity<SavedSignatureResponse> {
        if (user == null) {
            return ResponseEntity.notFound().build()
        }
        val signature = savedSignatureService.getDefaultSignature(user.userId)
        return if (signature != null) {
            ResponseEntity.ok(signature)
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @PostMapping
    fun createSignature(
        @AuthenticationPrincipal user: AuthenticatedUser,
        @RequestBody request: CreateSignatureRequest
    ): ResponseEntity<SavedSignatureResponse> {
        val signature = savedSignatureService.createSignature(user.userId, request)
        return ResponseEntity.status(HttpStatus.CREATED).body(signature)
    }

    @PatchMapping("/{id}")
    fun updateSignature(
        @AuthenticationPrincipal user: AuthenticatedUser,
        @PathVariable id: UUID,
        @RequestBody request: UpdateSignatureRequest
    ): ResponseEntity<SavedSignatureResponse> {
        val signature = savedSignatureService.updateSignature(user.userId, id, request)
        return ResponseEntity.ok(signature)
    }

    @DeleteMapping("/{id}")
    fun deleteSignature(
        @AuthenticationPrincipal user: AuthenticatedUser,
        @PathVariable id: UUID
    ): ResponseEntity<Void> {
        savedSignatureService.deleteSignature(user.userId, id)
        return ResponseEntity.noContent().build()
    }
}
