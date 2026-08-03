'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { organizationApi, type UserOrganization } from '@/lib/api'

export default function OrganizationsPage() {
  const router = useRouter()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [name, setName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [organizations, setOrganizations] = useState<UserOrganization[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    try {
      setIsLoading(true)
      const data = await organizationApi.getMyOrganizations()
      setOrganizations(data)
    } catch (err) {
      console.error('Error loading organizations:', err)
      setError('Error al cargar organizaciones')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    try {
      setIsCreating(true)
      await organizationApi.createOrganization({ name, taxId: taxId || undefined })
      setShowCreateForm(false)
      setName('')
      setTaxId('')
      await loadOrganizations()
    } catch (err) {
      console.error('Error creating organization:', err)
      setError('Error al crear organización')
    } finally {
      setIsCreating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Cargando organizaciones...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mis Organizaciones</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Crear Organización
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Nueva Organización</h2>
          <form onSubmit={handleCreate}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">RUT (opcional)</label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="12.345.678-9"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isCreating}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isCreating ? 'Creando...' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  setError('')
                }}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {organizations.map((org) => (
          <div key={org.id} className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold">{org.organizationName}</h3>
                <p className="text-sm text-gray-600">Rol: {org.role}</p>
                <p className="text-sm text-gray-500">Miembro desde: {new Date(org.joinedAt).toLocaleDateString('es-CL')}</p>
              </div>
              {(org.role === 'OWNER' || org.role === 'ADMIN') && (
                <button
                  onClick={() => router.push(`/organizations/${org.organizationId}`)}
                  className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Administrar
                </button>
              )}
            </div>
          </div>
        ))}
        {organizations.length === 0 && (
          <p className="text-gray-600">No tienes organizaciones. Crea una para comenzar.</p>
        )}
      </div>
    </div>
  )
}
