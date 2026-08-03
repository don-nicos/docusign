'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { SignatureModal } from '@/components/SignatureModal'
import { userApi, savedSignatureApi } from '@/lib/api'
import type { SavedSignature } from '@/types'

export default function ProfilePage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    rut: '',
    firstName: '',
    lastName: '',
    secondLastName: '',
    phone: '',
  })
  const [signatures, setSignatures] = useState<SavedSignature[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSignatures, setLoadingSignatures] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [showSignatureModal, setShowSignatureModal] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        email: user.email || '',
        rut: user.rut || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        secondLastName: user.secondLastName || '',
        phone: user.phone || '',
      })
      loadSignatures()
    }
  }, [user])

  const loadSignatures = async () => {
    try {
      setLoadingSignatures(true)
      const data = await savedSignatureApi.list()
      setSignatures(data)
    } catch (err) {
      console.error('Error al cargar firmas:', err)
    } finally {
      setLoadingSignatures(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await userApi.updateProfile({
        fullName: formData.fullName,
        rut: formData.rut,
        firstName: formData.firstName,
        lastName: formData.lastName,
        secondLastName: formData.secondLastName,
        phone: formData.phone,
      })
      setSuccess('Perfil actualizado exitosamente')
      setIsEditing(false)
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleAddSignature = () => {
    setShowSignatureModal(true)
  }

  const handleDeleteSignature = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta firma?')) return
    
    try {
      await savedSignatureApi.delete(id)
      setSignatures(signatures.filter(sig => sig.id !== id))
      setSuccess('Firma eliminada exitosamente')
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la firma')
    }
  }

  const handleSaveSignature = async (name: string, signatureData: string, isDefault: boolean) => {
    try {
      // Si se marca como por defecto, desmarcar las demás
      if (isDefault) {
        const updatePromises = signatures
          .filter(sig => sig.isDefault)
          .map(sig => savedSignatureApi.update(sig.id, { ...sig, isDefault: false }))
        await Promise.all(updatePromises)
      }
      
      const newSignature = await savedSignatureApi.create({ name, signatureData, isDefault })
      
      // Actualizar lista local
      const updatedSignatures = signatures.map(sig => ({ ...sig, isDefault: false }))
      setSignatures([...updatedSignatures, newSignature])
      
      setSuccess('Firma guardada exitosamente')
      setShowSignatureModal(false)
    } catch (err: any) {
      setError(err.message || 'Error al guardar la firma')
      throw err
    }
  }

  const handleSetDefault = async (signatureId: string) => {
    try {
      // Desmarcar todas las firmas como por defecto
      const updatePromises = signatures.map(sig => 
        savedSignatureApi.update(sig.id, { 
          ...sig, 
          isDefault: sig.id === signatureId 
        })
      )
      await Promise.all(updatePromises)
      
      // Actualizar estado local
      setSignatures(signatures.map(sig => ({
        ...sig,
        isDefault: sig.id === signatureId
      })))
      
      setSuccess('Firma por defecto actualizada')
    } catch (err: any) {
      setError(err.message || 'Error al actualizar firma por defecto')
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
          <p className="text-gray-600 mt-1">Gestiona tu información personal y firmas</p>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="text-center">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-3xl font-bold">
                    {user?.fullName?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">{user?.fullName}</h2>
                <p className="text-sm text-gray-600 mt-1">{user?.email}</p>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-sm text-gray-600">
                    <p>Miembro desde</p>
                    <p className="font-medium text-gray-900">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('es-CL', { 
                        month: 'long', 
                        year: 'numeric' 
                      }) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Información Personal */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-50 p-2 rounded-lg">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Información Personal</h2>
                  </div>
                  {!isEditing && (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </Button>
                  )}
                </div>
              </div>
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Completo
                    </label>
                    <Input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      disabled={!isEditing}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">El email no se puede cambiar</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      RUT
                    </label>
                    <Input
                      type="text"
                      value={formData.rut}
                      onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                      disabled={!isEditing}
                      placeholder="12.345.678-9"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Primer Nombre
                    </label>
                    <Input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Juan"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Apellido Paterno
                    </label>
                    <Input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Pérez"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Apellido Materno
                    </label>
                    <Input
                      type="text"
                      value={formData.secondLastName}
                      onChange={(e) => setFormData({ ...formData, secondLastName: e.target.value })}
                      disabled={!isEditing}
                      placeholder="González"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={!isEditing}
                      placeholder="+56 9 1234 5678"
                    />
                  </div>

                  {isEditing && (
                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setIsEditing(false)
                          setFormData({
                            fullName: user?.fullName || '',
                            email: user?.email || '',
                            rut: user?.rut || '',
                            firstName: user?.firstName || '',
                            lastName: user?.lastName || '',
                            secondLastName: user?.secondLastName || '',
                            phone: user?.phone || '',
                          })
                        }}
                        disabled={loading}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" variant="primary" disabled={loading}>
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                      </Button>
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* Mis Firmas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-purple-50 p-2 rounded-lg">
                      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Mis Firmas</h2>
                  </div>
                  <Button variant="primary" size="sm" onClick={handleAddSignature}>
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar Firma
                  </Button>
                </div>
              </div>
              <div className="p-6">
                {loadingSignatures ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="text-gray-600 mt-4">Cargando firmas...</p>
                  </div>
                ) : signatures.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 mb-4">No tienes firmas guardadas</p>
                    <p className="text-sm text-gray-500 mb-4">
                      Agrega tus firmas para usarlas rápidamente en tus documentos
                    </p>
                    <Button variant="primary" size="sm" onClick={handleAddSignature}>
                      Agregar Mi Primera Firma
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {signatures.map((sig) => (
                      <div
                        key={sig.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:bg-purple-50/50 transition-all"
                      >
                        <div className="aspect-video bg-white rounded border border-gray-100 flex items-center justify-center mb-2 overflow-hidden">
                          <img 
                            src={sig.signatureData} 
                            alt={sig.name}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-gray-900 truncate block">{sig.name}</span>
                              {sig.isDefault && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                                  ⭐ Por defecto
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {!sig.isDefault && (
                              <button 
                                onClick={() => handleSetDefault(sig.id)}
                                className="flex-1 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium py-1.5 px-3 rounded transition-colors"
                              >
                                Establecer por defecto
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteSignature(sig.id)}
                              className="text-xs bg-red-50 hover:bg-red-100 text-red-700 font-medium py-1.5 px-3 rounded transition-colors"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Modal de Firma */}
      <SignatureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSave={handleSaveSignature}
        userFullName={user?.fullName || ''}
      />
    </div>
  )
}
