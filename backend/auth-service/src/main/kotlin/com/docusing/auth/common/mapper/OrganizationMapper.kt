package com.docusing.auth.common.mapper

import com.docusing.auth.common.dto.response.OrganizationResponse
import com.docusing.auth.common.dto.response.UserOrganizationResponse
import com.docusing.auth.domain.model.OrganizationEntity
import com.docusing.auth.domain.model.UserOrganizationEntity
import org.springframework.stereotype.Component

@Component
class OrganizationMapper {

    fun toResponse(entity: OrganizationEntity): OrganizationResponse {
        return OrganizationResponse(
            id = entity.id.toString(),
            name = entity.name,
            taxId = entity.taxId,
            status = entity.status,
            createdAt = entity.createdAt
        )
    }

    fun toUserOrganizationResponse(entity: UserOrganizationEntity): UserOrganizationResponse {
        return UserOrganizationResponse(
            id = entity.id.toString(),
            userId = entity.user.id.toString(),
            userEmail = entity.user.email,
            userFullName = entity.user.fullName,
            organizationId = entity.organization.id.toString(),
            organizationName = entity.organization.name,
            role = entity.role,
            isActive = entity.isActive,
            joinedAt = entity.joinedAt
        )
    }

    fun toUserOrganizationResponseList(entities: List<UserOrganizationEntity>): List<UserOrganizationResponse> {
        return entities.map { toUserOrganizationResponse(it) }
    }
}
