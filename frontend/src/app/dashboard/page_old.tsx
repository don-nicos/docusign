'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { documentApi, signatureApi } from '@/lib/api'
import type { Document, SignatureRequest, SignerStatus } from '@/types'

interface DashboardStats {
  totalDocuments: number
  totalSignatures: number
  pendingSignatures: number
  completedSignatures: number
  documentsThisMonth: number
  signaturesThisMonth: number
}

export default function DashboardPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [signatures, setSignatures] = useState<SignatureRequest[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    totalSignatures: 0,
    pendingSignatures: 0,
    completedSignatures: 0,
    documentsThisMonth: 0,
    signaturesThisMonth: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated])

  const loadData = async () => {
    try {
      setLoading(true)
      const [docsData, sigsCreated, sigsTosign] = await Promise.all([
        documentApi.list() as Promise<Document[]>,
        signatureApi.list() as Promise<SignatureRequest[]>,
        signatureApi.listMyRequests() as Promise<SignatureRequest[]>,
      ])
      setDocuments(docsData)
      // Combinar solicitudes creadas y solicitudes para firmar, eliminando duplicados
      const allSigs = [...sigsCreated, ...sigsTosign]
      const uniqueSigs = allSigs.filter((sig, index, self) => 
        index === self.findIndex(s => s.id === sig.id)
      )
      setSignatures(uniqueSigs)

      // Calcular estadísticas
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const newStats: DashboardStats = {
        totalDocuments: docsData.length,
        totalSignatures: uniqueSigs.length,
        pendingSignatures: uniqueSigs.filter(s => s.status === 'IN_PROGRESS' || s.status === 'PENDING').length,
        completedSignatures: uniqueSigs.filter(s => s.status === 'COMPLETED').length,
        documentsThisMonth: docsData.filter(d => new Date(d.createdAt) >= firstDayOfMonth).length,
        signaturesThisMonth: uniqueSigs.filter(s => new Date(s.createdAt) >= firstDayOfMonth).length,
      }
      setStats(newStats)
    } catch (err) {
      setError('Error al cargar los datos')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Bienvenido, {user?.fullName}
          </h1>
          <p className="text-gray-600 mt-1">
            {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link href="/documents/upload" className="group">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Subir Documento</h3>
                  <p className="text-blue-100 text-sm">Carga un nuevo PDF para firmar</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg group-hover:bg-white/30 transition-colors">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/signatures" className="group">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Ver Solicitudes</h3>
                  <p className="text-green-100 text-sm">Gestiona tus firmas pendientes</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg group-hover:bg-white/30 transition-colors">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Documentos</span>
              <div className="bg-blue-50 p-2 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalDocuments}</p>
            <p className="text-xs text-gray-500 mt-1">+{stats.documentsThisMonth} este mes</p>
          </div>

          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Solicitudes</span>
              <div className="bg-purple-50 p-2 rounded-lg">
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalSignatures}</p>
            <p className="text-xs text-gray-500 mt-1">+{stats.signaturesThisMonth} este mes</p>
          </div>

          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Pendientes</span>
              <div className="bg-amber-50 p-2 rounded-lg">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingSignatures}</p>
            <p className="text-xs text-gray-500 mt-1">Requieren acción</p>
          </div>

          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Completadas</span>
              <div className="bg-green-50 p-2 rounded-lg">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.completedSignatures}</p>
            <p className="text-xs text-gray-500 mt-1">Firmadas exitosamente</p>
          </div>
        </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Cargando...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <Card title="Documentos Recientes">
            {documents.length === 0 ? (
              <div className="text-center py-8 text-gray-700">
                <svg
                  className="w-12 h-12 mx-auto mb-4 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p>No tienes documentos aún</p>
                <Link href="/documents/upload">
                  <Button variant="primary" className="mt-4">
                    Subir tu primer documento
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {documents.slice(0, 5).map((doc) => (
                  <div
                    key={doc.id}
                    className="py-4 flex items-center justify-between hover:bg-gray-50 px-2 rounded transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{doc.title}</h3>
                      <p className="text-sm text-gray-700">
                        {doc.originalFilename} • {(doc.fileSize / 1024).toFixed(1)} KB
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(doc.createdAt).toLocaleDateString('es-CL')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${
                          doc.status === 'DRAFT'
                            ? 'bg-gray-600 text-white'
                            : doc.status === 'LOCKED'
                            ? 'bg-amber-600 text-white'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {doc.status === 'LOCKED' && signatures.some(s => s.documentId === doc.id && s.status === 'COMPLETED') ? 'FIRMADO' : doc.status}
                      </span>
                      <Link href={`/documents/${doc.id}/view`}>
                        <Button variant="ghost" size="sm">
                          👁 Ver
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Solicitudes de Firma Activas">
            {signatures.length === 0 ? (
              <div className="text-center py-8 text-gray-700">
                <svg
                  className="w-12 h-12 mx-auto mb-4 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
                <p>No tienes solicitudes de firma activas</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {signatures.slice(0, 5).map((sig) => (
                  <div
                    key={sig.id}
                    className="py-4 flex items-center justify-between hover:bg-gray-50 px-2 rounded transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{sig.title}</h3>
                      <p className="text-sm text-gray-700">
                        {sig.signers.length} firmante(s) •{' '}
                        {sig.signers.filter((s) => s.status === 'SIGNED').length} firmado(s)
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(sig.createdAt).toLocaleDateString('es-CL')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${
                          sig.status === 'PENDING'
                            ? 'bg-gray-600 text-white'
                            : sig.status === 'IN_PROGRESS'
                            ? 'bg-amber-600 text-white'
                            : sig.status === 'COMPLETED'
                            ? 'bg-green-600 text-white'
                            : 'bg-red-600 text-white'
                        }`}
                      >
                        {sig.status === 'COMPLETED' ? 'COMPLETADO' : sig.status === 'IN_PROGRESS' ? 'EN PROCESO' : sig.status === 'PENDING' ? 'PENDIENTE' : sig.status}
                      </span>
                      <Link href={`/signatures/${sig.id}/view`}>
                        <Button variant="ghost" size="sm">
                          👁 Ver
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
      </div>
    </div>
  )
}
