'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { documentApi, signatureApi } from '@/lib/api'
import type { Document, SignatureRequest } from '@/types'

interface DashboardStats {
  totalDocuments: number
  totalSignatures: number
  pendingSignatures: number
  completedSignatures: number
  documentsThisMonth: number
  signaturesThisMonth: number
  pendingToSign: number
  pendingFromOthers: number
}

export default function DashboardPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [signaturesSent, setSignaturesSent] = useState<SignatureRequest[]>([])
  const [signaturesToSign, setSignaturesToSign] = useState<SignatureRequest[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    totalSignatures: 0,
    pendingSignatures: 0,
    completedSignatures: 0,
    documentsThisMonth: 0,
    signaturesThisMonth: 0,
    pendingToSign: 0,
    pendingFromOthers: 0,
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
  }, [isAuthenticated, user?.id])

  const loadData = async () => {
    // Asegurarse de que tenemos el userId antes de hacer llamadas
    if (!user?.id) {
      console.log('[Dashboard] Esperando userId...')
      return
    }

    try {
      setLoading(true)
      console.log('[Dashboard] Iniciando carga de datos para userId:', user.id)
      
      const [docsData, sigsCreated, sigsTosign] = await Promise.all([
        documentApi.list() as Promise<Document[]>,
        signatureApi.list() as Promise<SignatureRequest[]>,
        signatureApi.listMyRequests() as Promise<SignatureRequest[]>,
      ])
      
      console.log('[Dashboard] Data loaded:', {
        documents: docsData.length,
        sigsCreated: sigsCreated.length,
        sigsTosign: sigsTosign.length
      })
      
      console.log('[Dashboard] Documentos:', docsData.map(d => ({
        id: d.id,
        title: d.title,
        status: d.status,
        createdAt: d.createdAt
      })))
      
      console.log('[Dashboard] Solicitudes creadas:', sigsCreated.map(s => ({
        id: s.id,
        title: s.title,
        status: s.status,
        documentId: s.documentId,
        signers: s.signers.length
      })))
      
      console.log('[Dashboard] Solicitudes para firmar:', sigsTosign.map(s => ({
        id: s.id,
        title: s.title,
        status: s.status,
        myStatus: s.signers.find(sg => sg.email === user?.email)?.status
      })))
      
      setDocuments(docsData)
      
      // Separar solicitudes enviadas vs solicitudes para firmar
      setSignaturesSent(sigsCreated)
      setSignaturesToSign(sigsTosign)
      
      // Combinar todas para estadísticas generales
      const allSigs = [...sigsCreated, ...sigsTosign]
      const uniqueSigs = allSigs.filter((sig, index, self) => 
        index === self.findIndex(s => s.id === sig.id)
      )

      // Calcular estadísticas
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      // Contar pendientes que YO debo firmar
      const pendingToSign = sigsTosign.filter(sig => {
        const mySigner = sig.signers.find(s => s.email === user?.email)
        return mySigner && mySigner.status === 'PENDING'
      }).length

      // Contar pendientes que OTROS deben firmar (de mis solicitudes enviadas)
      const pendingFromOthers = sigsCreated.filter(sig => 
        sig.status === 'IN_PROGRESS' || sig.status === 'PENDING'
      ).length
      
      console.log('[Dashboard] Stats calculated:', {
        pendingToSign,
        pendingFromOthers,
        completed: uniqueSigs.filter(s => s.status === 'COMPLETED').length
      })

      const newStats: DashboardStats = {
        totalDocuments: docsData.length,
        totalSignatures: uniqueSigs.length,
        pendingSignatures: uniqueSigs.filter(s => s.status === 'IN_PROGRESS' || s.status === 'PENDING').length,
        completedSignatures: uniqueSigs.filter(s => s.status === 'COMPLETED').length,
        documentsThisMonth: docsData.filter(d => new Date(d.createdAt) >= firstDayOfMonth).length,
        signaturesThisMonth: uniqueSigs.filter(s => new Date(s.createdAt) >= firstDayOfMonth).length,
        pendingToSign,
        pendingFromOthers,
      }
      setStats(newStats)
    } catch (err) {
      setError('Error al cargar los datos')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !isAuthenticated || !user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]">
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
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]">
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
          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
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

          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Pendiente Firmar</span>
              <div className="bg-orange-50 p-2 rounded-lg">
                <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingToSign}</p>
            <p className="text-xs text-gray-500 mt-1">Debo firmar</p>
          </div>

          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Esperando Firmas</span>
              <div className="bg-amber-50 p-2 rounded-lg">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingFromOthers}</p>
            <p className="text-xs text-gray-500 mt-1">
              Otros deben firmar
              {signaturesSent.length > 0 && ` • ${signaturesSent.length} total`}
            </p>
          </div>

          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
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
            {/* Documentos Recientes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Documentos Recientes</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Documentos que has subido • <span className="font-medium">EN FIRMA</span> = tiene solicitud de firma activa
                    </p>
                  </div>
                  <Link href="/documents">
                    <Button variant="ghost" size="sm">Ver todos →</Button>
                  </Link>
                </div>
              </div>
              <div className="p-6">
                {documents.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 mb-4">No tienes documentos aún</p>
                    <Link href="/documents/upload">
                      <Button variant="primary" size="sm">Subir tu primer documento</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.slice(0, 5).map((doc) => (
                      <Link key={doc.id} href={`/documents/${doc.id}/view`}>
                        <div className="group p-4 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all cursor-pointer">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <h3 className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">{doc.title}</h3>
                              </div>
                              <p className="text-sm text-gray-500 truncate">{doc.originalFilename}</p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                                <span>•</span>
                                <span>{new Date(doc.createdAt).toLocaleDateString('es-CL')}</span>
                              </div>
                            </div>
                            <span className={`ml-3 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                              doc.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' :
                              doc.status === 'LOCKED' ? 'bg-blue-100 text-blue-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {doc.status === 'DRAFT' ? 'BORRADOR' :
                               doc.status === 'LOCKED' ? 'EN FIRMA' :
                               doc.status === 'ARCHIVED' ? 'ARCHIVADO' : doc.status}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Grid de Solicitudes */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Pendientes de Firmar (YO debo firmar) */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-orange-50 p-2 rounded-lg">
                        <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">Pendiente de Firmar</h2>
                    </div>
                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-bold">
                      {stats.pendingToSign}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  {signaturesToSign.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-600">No tienes documentos pendientes de firmar</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {signaturesToSign.slice(0, 5).map((sig) => {
                        const mySigner = sig.signers.find(s => s.email === user?.email)
                        return (
                          <Link key={sig.id} href={`/signatures/${sig.id}/view`}>
                            <div className="group p-4 rounded-lg border border-gray-100 hover:border-orange-200 hover:bg-orange-50/50 transition-all cursor-pointer">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <svg className="w-5 h-5 text-orange-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                    <h3 className="font-medium text-gray-900 truncate group-hover:text-orange-600 transition-colors">{sig.title}</h3>
                                  </div>
                                  <p className="text-sm text-gray-500">
                                    {sig.signers.filter(s => s.status === 'SIGNED').length} de {sig.signers.length} firmantes
                                  </p>
                                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                    <span>{new Date(sig.createdAt).toLocaleDateString('es-CL')}</span>
                                    {sig.expiresAt && (
                                      <>
                                        <span>•</span>
                                        <span>Expira: {new Date(sig.expiresAt).toLocaleDateString('es-CL')}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <span className={`ml-3 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                  mySigner?.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                                  mySigner?.status === 'SIGNED' ? 'bg-green-100 text-green-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {mySigner?.status === 'SIGNED' ? 'FIRMADO' : 'PENDIENTE'}
                                </span>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Esperando Firmas (OTROS deben firmar) */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-amber-50 p-2 rounded-lg">
                        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">Esperando Firmas</h2>
                    </div>
                    <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-bold">
                      {stats.pendingFromOthers}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  {signaturesSent.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-600">No has enviado solicitudes de firma</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {signaturesSent.slice(0, 5).map((sig) => (
                        <Link key={sig.id} href={`/signatures/${sig.id}/view`}>
                          <div className="group p-4 rounded-lg border border-gray-100 hover:border-amber-200 hover:bg-amber-50/50 transition-all cursor-pointer">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <h3 className="font-medium text-gray-900 truncate group-hover:text-amber-600 transition-colors">{sig.title}</h3>
                                </div>
                                <p className="text-sm text-gray-500">
                                  {sig.signers.filter(s => s.status === 'SIGNED').length} de {sig.signers.length} firmantes
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                  <span>{new Date(sig.createdAt).toLocaleDateString('es-CL')}</span>
                                  {sig.expiresAt && (
                                    <>
                                      <span>•</span>
                                      <span>Expira: {new Date(sig.expiresAt).toLocaleDateString('es-CL')}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <span className={`ml-3 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                sig.status === 'PENDING' ? 'bg-gray-100 text-gray-700' :
                                sig.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' :
                                sig.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {sig.status === 'COMPLETED' ? 'COMPLETADO' : 
                                 sig.status === 'IN_PROGRESS' ? 'EN PROCESO' : 
                                 sig.status === 'PENDING' ? 'PENDIENTE' : sig.status}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
