'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { organizationApi, Organization, UserOrganization } from '@/lib/api'

export default function OrganizationDetailPage() {
  const params = useParams()
  const organizationId = params.id as string
  
  const [showAddMember, setShowAddMember] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER')
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [members, setMembers] = useState<UserOrganization[]>([])
  const [myRole, setMyRole] = useState<{ role: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [organizationId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [orgData, membersData, roleData] = await Promise.all([
        organizationApi.getOrganization(organizationId),
        organizationApi.getMembers(organizationId),
        organizationApi.getMyRole(organizationId)
      ])
      setOrganization(orgData)
      setMembers(membersData)
      setMyRole(roleData)
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    try {
      setActionLoading(true)
      await organizationApi.addMember(organizationId, { userEmail: email, role })
      setShowAddMember(false)
      setEmail('')
      setRole('MEMBER')
      await loadData()
    } catch (err) {
      console.error('Error adding member:', err)
      setError('Error al agregar usuario')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('¿Remover este usuario?')) return
    
    try {
      setActionLoading(true)
      await organizationApi.removeMember(organizationId, memberId)
      await loadData()
    } catch (err) {
      console.error('Error removing member:', err)
      setError('Error al remover usuario')
    } finally {
      setActionLoading(false)
    }
  }

  const handleChangeRole = async (memberId: string, newRole: 'ADMIN' | 'MEMBER') => {
    try {
      setActionLoading(true)
      await organizationApi.changeRole(organizationId, memberId, newRole)
      await loadData()
    } catch (err) {
      console.error('Error changing role:', err)
      setError('Error al cambiar rol')
    } finally {
      setActionLoading(false)
    }
  }

  const canManageMembers = myRole?.role === 'OWNER' || myRole?.role === 'ADMIN'
  const isOwner = myRole?.role === 'OWNER'

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Cargando...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <h1 className="text-3xl font-bold mb-6">{organization?.name}</h1>

      {canManageMembers && (
        <div className="mb-6">
          <button
            onClick={() => setShowAddMember(!showAddMember)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Agregar Usuario
          </button>
        </div>
      )}

      {showAddMember && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Agregar Usuario</h2>
          <form onSubmit={handleAddMember}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Email del usuario</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Rol</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'ADMIN' | 'MEMBER')}
                className="w-full border rounded px-3 py-2"
              >
                <option value="MEMBER">Miembro</option>
                {isOwner && <option value="ADMIN">Administrador</option>}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={actionLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? 'Agregando...' : 'Agregar'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddMember(false)}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold p-6 border-b">Miembros</h2>
        <div className="divide-y">
          {members.map((member: UserOrganization) => (
            <div key={member.id} className="p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">{member.userFullName}</p>
                <p className="text-sm text-gray-600">{member.userEmail}</p>
                <p className="text-sm text-gray-500">Rol: {member.role}</p>
              </div>
              {member.role !== 'OWNER' && canManageMembers && (
                <div className="flex gap-2">
                  {isOwner && member.role === 'MEMBER' && (
                    <button
                      onClick={() => handleChangeRole(member.userId, 'ADMIN')}
                      disabled={actionLoading}
                      className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
                    >
                      Hacer Admin
                    </button>
                  )}
                  {isOwner && member.role === 'ADMIN' && (
                    <button
                      onClick={() => handleChangeRole(member.userId, 'MEMBER')}
                      disabled={actionLoading}
                      className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
                    >
                      Quitar Admin
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveMember(member.userId)}
                    disabled={actionLoading}
                    className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
                  >
                    Remover
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
