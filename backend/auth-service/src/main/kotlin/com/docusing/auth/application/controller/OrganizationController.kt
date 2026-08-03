package com.docusing.auth.application.controller

import com.docusing.auth.common.dto.request.*
import com.docusing.auth.common.dto.response.*
import com.docusing.auth.common.mapper.OrganizationMapper
import com.docusing.auth.infrastructure.security.AuthenticatedUser
import com.docusing.auth.core.service.OrganizationService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/organizations")
class OrganizationController(
    private val organizationService: OrganizationService,
    private val organizationMapper: OrganizationMapper
) {

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createOrganization(
        @RequestHeader("X-User-Id") userId: String,
        @Valid @RequestBody request: CreateOrganizationRequest
    ): OrganizationResponse {
        val ownerId = UUID.fromString(userId)
        val organization = organizationService.createOrganization(
            ownerId = ownerId,
            name = request.name,
            taxId = request.taxId
        )
        return organizationMapper.toResponse(organization)
    }

    @GetMapping("/{organizationId}")
    fun getOrganization(
        @PathVariable organizationId: UUID
    ): OrganizationResponse {
        val organization = organizationService.getOrganization(organizationId)
        return organizationMapper.toResponse(organization)
    }

    @GetMapping("/my")
    fun getMyOrganizations(
        @RequestHeader("X-User-Id") userId: String
    ): List<UserOrganizationResponse> {
        val userUuid = UUID.fromString(userId)
        val memberships = organizationService.getUserOrganizations(userUuid)
        return organizationMapper.toUserOrganizationResponseList(memberships)
    }

    @GetMapping("/{organizationId}/members")
    fun getOrganizationMembers(
        @PathVariable organizationId: UUID
    ): List<UserOrganizationResponse> {
        val members = organizationService.getOrganizationMembers(organizationId)
        return organizationMapper.toUserOrganizationResponseList(members)
    }

    @PostMapping("/{organizationId}/members")
    @ResponseStatus(HttpStatus.CREATED)
    fun addUserToOrganization(
        @RequestHeader("X-User-Id") userId: String,
        @PathVariable organizationId: UUID,
        @Valid @RequestBody request: AddUserToOrganizationRequest
    ): UserOrganizationResponse {
        val requesterId = UUID.fromString(userId)
        val membership = organizationService.addUserToOrganization(
            requesterId = requesterId,
            organizationId = organizationId,
            userEmail = request.userEmail,
            role = request.role
        )
        return organizationMapper.toUserOrganizationResponse(membership)
    }

    @DeleteMapping("/{organizationId}/members/{memberId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun removeUserFromOrganization(
        @RequestHeader("X-User-Id") userId: String,
        @PathVariable organizationId: UUID,
        @PathVariable memberId: UUID
    ) {
        val requesterId = UUID.fromString(userId)
        organizationService.removeUserFromOrganization(requesterId, organizationId, memberId)
    }

    @PutMapping("/{organizationId}/members/{memberId}/role")
    fun changeUserRole(
        @RequestHeader("X-User-Id") userId: String,
        @PathVariable organizationId: UUID,
        @PathVariable memberId: UUID,
        @Valid @RequestBody request: ChangeUserRoleRequest
    ): UserOrganizationResponse {
        val requesterId = UUID.fromString(userId)
        val membership = organizationService.changeUserRole(
            requesterId = requesterId,
            organizationId = organizationId,
            userId = memberId,
            newRole = request.role
        )
        return organizationMapper.toUserOrganizationResponse(membership)
    }

    @GetMapping("/{organizationId}/my-role")
    fun getMyRole(
        @RequestHeader("X-User-Id") userId: String,
        @PathVariable organizationId: UUID
    ): Map<String, String?> {
        val userUuid = UUID.fromString(userId)
        val role = organizationService.getUserRole(userUuid, organizationId)
        return mapOf("role" to role?.name)
    }
}
