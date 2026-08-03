package com.docusing.auth.application.controller

import com.docusing.auth.common.dto.request.UpdateProfileRequest
import com.docusing.auth.common.dto.response.UserResponse
import com.docusing.auth.core.service.UserProfileService
import com.docusing.auth.infrastructure.security.AuthenticatedUser
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/users")
class UserProfileController(
    private val userProfileService: UserProfileService
) {
    @GetMapping("/me")
    fun getCurrentUser(
        @AuthenticationPrincipal user: AuthenticatedUser
    ): ResponseEntity<UserResponse> {
        val userProfile = userProfileService.getUserProfile(user.userId)
        return ResponseEntity.ok(userProfile)
    }

    @PutMapping("/profile")
    fun updateProfile(
        @AuthenticationPrincipal user: AuthenticatedUser,
        @RequestBody request: UpdateProfileRequest
    ): ResponseEntity<UserResponse> {
        val updated = userProfileService.updateProfile(user.userId, request)
        return ResponseEntity.ok(updated)
    }

    @GetMapping("/by-email/{email}")
    fun getUserByEmail(
        @PathVariable email: String
    ): ResponseEntity<UserResponse> {
        val user = userProfileService.getUserByEmail(email)
        return if (user != null) {
            ResponseEntity.ok(user)
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @GetMapping("/{userId}")
    fun getUserById(
        @PathVariable userId: UUID
    ): ResponseEntity<UserResponse> {
        val user = userProfileService.getUserProfile(userId)
        return ResponseEntity.ok(user)
    }
}
