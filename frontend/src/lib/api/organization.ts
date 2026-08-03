import { apiClient } from '../api'
import { API_CONFIG } from '../config'

export interface Organization {
  id: string
  name: string
  taxId: string | null
  status: string
  createdAt: string
}

export interface UserOrganization {
  id: string
  userId: string
  userEmail: string
  userFullName: string
  organizationId: string
  organizationName: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  isActive: boolean
  joinedAt: string
}

export const organizationApi = {
  createOrganization: (data: { name: string; taxId?: string }) =>
    apiClient.post<Organization>(`${API_CONFIG.AUTH_SERVICE}/api/organizations`, data),

  getMyOrganizations: () =>
    apiClient.get<UserOrganization[]>(`${API_CONFIG.AUTH_SERVICE}/api/organizations/my`),

  getOrganization: (organizationId: string) =>
    apiClient.get<Organization>(`${API_CONFIG.AUTH_SERVICE}/api/organizations/${organizationId}`),

  getMembers: (organizationId: string) =>
    apiClient.get<UserOrganization[]>(`${API_CONFIG.AUTH_SERVICE}/api/organizations/${organizationId}/members`),

  addMember: (organizationId: string, data: { userEmail: string; role: 'ADMIN' | 'MEMBER' }) =>
    apiClient.post<UserOrganization>(`${API_CONFIG.AUTH_SERVICE}/api/organizations/${organizationId}/members`, data),

  removeMember: (organizationId: string, memberId: string) =>
    apiClient.delete(`${API_CONFIG.AUTH_SERVICE}/api/organizations/${organizationId}/members/${memberId}`),

  changeRole: (organizationId: string, memberId: string, role: 'ADMIN' | 'MEMBER') =>
    apiClient.put<UserOrganization>(
      `${API_CONFIG.AUTH_SERVICE}/api/organizations/${organizationId}/members/${memberId}/role`,
      { role }
    ),

  getMyRole: (organizationId: string) =>
    apiClient.get<{ role: string | null }>(`${API_CONFIG.AUTH_SERVICE}/api/organizations/${organizationId}/my-role`),
}
