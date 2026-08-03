package com.docusing.auth.domain.repository

import com.docusing.auth.domain.model.OrganizationRole
import com.docusing.auth.domain.model.UserOrganizationEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface UserOrganizationRepository : JpaRepository<UserOrganizationEntity, UUID> {
    fun findByUserIdAndOrganizationId(userId: UUID, organizationId: UUID): UserOrganizationEntity?
    fun findAllByUserId(userId: UUID): List<UserOrganizationEntity>
    fun findAllByOrganizationId(organizationId: UUID): List<UserOrganizationEntity>
    fun findAllByUserIdAndIsActive(userId: UUID, isActive: Boolean): List<UserOrganizationEntity>
    fun findAllByOrganizationIdAndIsActive(organizationId: UUID, isActive: Boolean): List<UserOrganizationEntity>
    
    @Query("SELECT uo FROM UserOrganizationEntity uo WHERE uo.user.id = :userId AND uo.organization.id = :organizationId AND uo.isActive = true")
    fun findActiveByUserIdAndOrganizationId(userId: UUID, organizationId: UUID): UserOrganizationEntity?
    
    @Query("SELECT uo FROM UserOrganizationEntity uo WHERE uo.organization.id = :organizationId AND uo.role IN :roles AND uo.isActive = true")
    fun findActiveByOrganizationIdAndRoleIn(organizationId: UUID, roles: List<OrganizationRole>): List<UserOrganizationEntity>
}
