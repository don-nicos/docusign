package com.docusing.auth.common.dto.response

import com.docusing.auth.domain.model.OrganizationRole
import com.docusing.auth.domain.model.OrganizationStatus
import java.time.Instant

data class CreateOrganizationRequest(
    val name: String,
    val taxId: String?
)

data class OrganizationResponse(
    val id: String,
    val name: String,
    val taxId: String?,
    val status: OrganizationStatus,
    val createdAt: Instant?
)

data class AddUserToOrganizationRequest(
    val userEmail: String,
    val role: OrganizationRole
)

data class ChangeUserRoleRequest(
    val role: OrganizationRole
)

data class UserOrganizationResponse(
    val id: String,
    val userId: String,
    val userEmail: String,
    val userFullName: String,
    val organizationId: String,
    val organizationName: String,
    val role: OrganizationRole,
    val isActive: Boolean,
    val joinedAt: Instant?
)
