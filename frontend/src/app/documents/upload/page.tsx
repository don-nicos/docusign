'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { documentApi, paymentApi, organizationApi, type UserOrganization } from '@/lib/api'
import type { Document, ApiError } from '@/types'

export default function UploadDocumentPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loadingAccess, setLoadingAccess] = useState(true)
  const [canUpload, setCanUpload] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>()
  const [myOrganizations, setMyOrganizations] = useState<UserOrganization[]>([])
  const [loadingOrgs, setLoadingOrgs] = useState(false)

  useEffect(() => {
    const loadAccess = async () => {
      try {
        setLoadingAccess(true)
        
        // Manejar count y access por separado
        let count = { count: 0 }
        let access
        
        try {
          count = await documentApi.count()
        } catch (countErr) {
          console.warn('⚠️ Error obteniendo count, usando 0 por defecto:', countErr)
        }
        
        try {
          access = await paymentApi.getMySubscriptionStatus(selectedOrgId)
        } catch (accessErr) {
          console.warn('⚠️ Error obteniendo status de suscripción:', accessErr)
        }

        const active = access?.active === true
        const canUpload = count.count < 3 || active
        
        console.log('📊 Count:', count.count, 'Active:', active, 'CanUpload:', canUpload)
        setCanUpload(canUpload)
      } catch (err) {
        console.error('❌ Error general:', err)
        setCanUpload(false)
      } finally {
        setLoadingAccess(false)
      }
    }

    if (isAuthenticated) {
      loadAccess()
    }
  }, [isAuthenticated, selectedOrgId])

  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        setLoadingOrgs(true)
        const orgs = await organizationApi.getMyOrganizations()
        setMyOrganizations(orgs)
      } catch (err) {
        console.error('Error loading organizations:', err)
      } finally {
        setLoadingOrgs(false)
      }
    }

    if (isAuthenticated) {
      loadOrganizations()
    }
  }, [isAuthenticated])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Solo se permiten archivos PDF')
        return
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('El archivo no debe superar 10 MB')
        return
      }
      setFile(selectedFile)
      if (!title) {
        setTitle(selectedFile.name.replace('.pdf', ''))
      }
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file) {
      setError('Debes seleccionar un archivo')
      return
    }

    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    setLoading(true)
    setError('')

    try {
      const document = await documentApi.upload(file, title, selectedOrgId) as Document
      router.push(`/documents/${document.id}`)
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.status === 403) {
        router.push('/subscription?reason=required')
        return
      }
      setError(apiError.message || 'Error al subir el documento')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!loadingAccess && !canUpload) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900">Límite de documentos</h1>
            <p className="text-gray-700 mt-2">
              Ya usaste los 3 documentos gratis. Para cargar más documentos necesitas una suscripción activa.
            </p>

            <div className="mt-6 flex gap-3">
              <Button variant="primary" onClick={() => router.push('/subscription?reason=required')}>
                Ver planes
              </Button>
              <Button variant="secondary" onClick={() => router.push('/documents')}>
                Volver
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Subir Documento</h1>
        <p className="text-gray-600 mt-2">
          Carga un archivo PDF para crear una solicitud de firma
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archivo PDF
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500 transition-colors">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500"
                  >
                    <span>Selecciona un archivo</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept="application/pdf"
                      className="sr-only"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">o arrastra y suelta</p>
                </div>
                <p className="text-xs text-gray-500">PDF hasta 10 MB</p>
              </div>
            </div>
            {file && (
              <div className="mt-2 flex items-center text-sm text-gray-600">
                <svg
                  className="h-5 w-5 text-green-500 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <Input
            label="Título del documento"
            type="text"
            placeholder="Mi documento importante"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organización
            </label>
            <select
              value={selectedOrgId || ''}
              onChange={(e) => setSelectedOrgId(e.target.value || undefined)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loadingOrgs}
            >
              <option value="">Personal (sin organización)</option>
              {myOrganizations.map(org => (
                <option key={org.organizationId} value={org.organizationId}>
                  {org.organizationName}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {selectedOrgId 
                ? 'Todos los miembros de la organización podrán acceder a este documento'
                : 'Solo tú podrás acceder a este documento'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex space-x-4">
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              isLoading={loading}
              disabled={!file}
            >
              Subir documento
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
