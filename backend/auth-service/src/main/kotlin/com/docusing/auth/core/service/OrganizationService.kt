package com.docusing.auth.core.service

import com.docusing.auth.domain.model.OrganizationEntity
import com.docusing.auth.domain.model.OrganizationRole
import com.docusing.auth.domain.model.OrganizationStatus
import com.docusing.auth.domain.model.UserOrganizationEntity
import com.docusing.auth.domain.repository.OrganizationRepository
import com.docusing.auth.domain.repository.UserOrganizationRepository
import com.docusing.auth.domain.repository.UserRepository
import mu.KotlinLogging
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

private val logger = KotlinLogging.logger {}

@Service
class OrganizationService(
    private val organizationRepository: OrganizationRepository,
    private val userOrganizationRepository: UserOrganizationRepository,
    private val userRepository: UserRepository
) {

    @Transactional
    fun createOrganization(ownerId: UUID, name: String, taxId: String?): OrganizationEntity {
        val owner = userRepository.findById(ownerId)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado") }

        val organization = OrganizationEntity(
            name = name,
            taxId = taxId,
            status = OrganizationStatus.ACTIVE
        )
        val savedOrg = organizationRepository.save(organization)

        val membership = UserOrganizationEntity(
            user = owner,
            organization = savedOrg,
            role = OrganizationRole.OWNER,
            isActive = true
        )
        userOrganizationRepository.save(membership)

        if (owner.defaultOrganizationId == null) {
            owner.defaultOrganizationId = savedOrg.id
            userRepository.save(owner)
        }

        logger.info { "Organización ${savedOrg.id} creada por usuario $ownerId" }
        return savedOrg
    }

    @Transactional(readOnly = true)
    fun getOrganization(organizationId: UUID): OrganizationEntity {
        return organizationRepository.findById(organizationId)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Organización no encontrada") }
    }

    @Transactional(readOnly = true)
    fun getUserOrganizations(userId: UUID): List<UserOrganizationEntity> {
        return userOrganizationRepository.findAllByUserIdAndIsActive(userId, true)
    }

    @Transactional(readOnly = true)
    fun getOrganizationMembers(organizationId: UUID): List<UserOrganizationEntity> {
        return userOrganizationRepository.findAllByOrganizationIdAndIsActive(organizationId, true)
    }

    @Transactional
    fun addUserToOrganization(
        requesterId: UUID,
        organizationId: UUID,
        userEmail: String,
        role: OrganizationRole
    ): UserOrganizationEntity {
        validatePermission(requesterId, organizationId, listOf(OrganizationRole.OWNER, OrganizationRole.ADMIN))

        val requesterMembership = userOrganizationRepository
            .findActiveByUserIdAndOrganizationId(requesterId, organizationId)
            ?: throw ResponseStatusException(HttpStatus.FORBIDDEN, "Sin permisos")

        if (requesterMembership.role == OrganizationRole.ADMIN && role == OrganizationRole.ADMIN) {
            throw ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Los administradores no pueden agregar otros administradores"
            )
        }

        val targetUser = userRepository.findByEmail(userEmail.lowercase())
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado") }

        val organization = getOrganization(organizationId)

        val existing = userOrganizationRepository.findByUserIdAndOrganizationId(targetUser.id!!, organizationId)
        if (existing != null) {
            if (existing.isActive) {
                throw ResponseStatusException(HttpStatus.CONFLICT, "Usuario ya es miembro")
            }
            existing.isActive = true
            existing.role = role
            return userOrganizationRepository.save(existing)
        }

        val membership = UserOrganizationEntity(
            user = targetUser,
            organization = organization,
            role = role,
            isActive = true
        )
        val saved = userOrganizationRepository.save(membership)

        logger.info { "Usuario ${targetUser.id} agregado a organización $organizationId con rol $role por $requesterId" }
        return saved
    }

    @Transactional
    fun removeUserFromOrganization(requesterId: UUID, organizationId: UUID, userId: UUID) {
        validatePermission(requesterId, organizationId, listOf(OrganizationRole.OWNER, OrganizationRole.ADMIN))

        val membership = userOrganizationRepository
            .findActiveByUserIdAndOrganizationId(userId, organizationId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no es miembro")

        if (membership.role == OrganizationRole.OWNER) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "No se puede remover al owner")
        }

        membership.isActive = false
        userOrganizationRepository.save(membership)

        logger.info { "Usuario $userId removido de organización $organizationId por $requesterId" }
    }

    @Transactional
    fun changeUserRole(
        requesterId: UUID,
        organizationId: UUID,
        userId: UUID,
        newRole: OrganizationRole
    ): UserOrganizationEntity {
        validatePermission(requesterId, organizationId, listOf(OrganizationRole.OWNER))

        val membership = userOrganizationRepository
            .findActiveByUserIdAndOrganizationId(userId, organizationId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no es miembro")

        if (membership.role == OrganizationRole.OWNER) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "No se puede cambiar el rol del owner")
        }

        membership.role = newRole
        val updated = userOrganizationRepository.save(membership)

        logger.info { "Rol de usuario $userId cambiado a $newRole en organización $organizationId por $requesterId" }
        return updated
    }

    @Transactional(readOnly = true)
    fun hasPermission(userId: UUID, organizationId: UUID, requiredRoles: List<OrganizationRole>): Boolean {
        val membership = userOrganizationRepository
            .findActiveByUserIdAndOrganizationId(userId, organizationId)
            ?: return false

        return requiredRoles.contains(membership.role)
    }

    @Transactional(readOnly = true)
    fun isMember(userId: UUID, organizationId: UUID): Boolean {
        return userOrganizationRepository
            .findActiveByUserIdAndOrganizationId(userId, organizationId) != null
    }

    @Transactional(readOnly = true)
    fun getUserRole(userId: UUID, organizationId: UUID): OrganizationRole? {
        return userOrganizationRepository
            .findActiveByUserIdAndOrganizationId(userId, organizationId)?.role
    }

    private fun validatePermission(userId: UUID, organizationId: UUID, allowedRoles: List<OrganizationRole>) {
        if (!hasPermission(userId, organizationId, allowedRoles)) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Permisos insuficientes")
        }
    }
}
