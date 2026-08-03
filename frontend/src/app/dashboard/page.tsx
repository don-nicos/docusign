'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { SessionManager } from '@/components/SessionManager'
import { documentApi, signatureApi } from '@/lib/api'
import type { Document, SignatureRequest } from '@/types'

export default function DashboardPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [myPendingSignatures, setMyPendingSignatures] = useState<SignatureRequest[]>([])
  const [sentSignatures, setSentSignatures] = useState<SignatureRequest[]>([])
  const [completedSignatures, setCompletedSignatures] = useState<SignatureRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadData()
    }
  }, [isAuthenticated, user?.id])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const [docsData, sigsCreated, sigsTosign] = await Promise.all([
        documentApi.list() as Promise<Document[]>,
        signatureApi.list() as Promise<SignatureRequest[]>,
        signatureApi.listMyRequests() as Promise<SignatureRequest[]>,
      ])
      
      setDocuments(docsData)
      
      // Solicitudes que YO debo firmar (pendientes)
      const pending = sigsTosign.filter(sig => {
        const mySigner = sig.signers.find(s => s.email === user?.email)
        return mySigner && mySigner.status === 'PENDING'
      })
      setMyPendingSignatures(pending)
      
      // Solicitudes que YO envié (esperando firmas de otros)
      const sent = sigsCreated.filter(sig => 
        sig.status === 'IN_PROGRESS' || sig.status === 'PENDING'
      )
      setSentSignatures(sent)
      
      // Todas las completadas (únicas)
      const allSigs = [...sigsCreated, ...sigsTosign]
      const uniqueCompleted = allSigs
        .filter((sig, index, self) => 
          sig.status === 'COMPLETED' && index === self.findIndex(s => s.id === sig.id)
        )
      setCompletedSignatures(uniqueCompleted)
      
    } catch (err) {
      console.error('Error cargando datos:', err)
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
    <>
      <SessionManager />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Hola, {user?.fullName?.split(' ')[0]} 👋
            </h1>
            <p className="text-gray-600 mt-1">
              {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Link href="/documents/upload" className="group">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Subir Documento</h3>
                    <p className="text-blue-100 text-sm">Carga un PDF para solicitar firmas</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg">
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
                    <h3 className="text-lg font-semibold mb-1">Mis Solicitudes</h3>
                    <p className="text-green-100 text-sm">Ver todas las solicitudes de firma</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Link href="/documents" className="block group">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all duration-200 cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600">Documentos</span>
                  <div className="bg-blue-50 p-2 rounded-lg group-hover:bg-blue-100">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{documents.length}</p>
                <p className="text-xs text-gray-500 mt-1 group-hover:text-blue-600">Click para ver todos</p>
              </div>
            </Link>

            <Link href="/signatures?filter=pending" className="block group">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-orange-100 hover:shadow-md hover:border-orange-200 transition-all duration-200 cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600 group-hover:text-orange-600">Debo Firmar</span>
                  <div className="bg-orange-50 p-2 rounded-lg group-hover:bg-orange-100">
                    <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-orange-600">{myPendingSignatures.length}</p>
                <p className="text-xs text-gray-500 mt-1 group-hover:text-orange-600">Click para ver todas</p>
              </div>
            </Link>

            <Link href="/signatures?filter=waiting" className="block group">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-amber-100 hover:shadow-md hover:border-amber-200 transition-all duration-200 cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600 group-hover:text-amber-600">Esperando</span>
                  <div className="bg-amber-50 p-2 rounded-lg group-hover:bg-amber-100">
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-amber-600">{sentSignatures.length}</p>
                <p className="text-xs text-gray-500 mt-1 group-hover:text-amber-600">Click para ver todas</p>
              </div>
            </Link>

            <Link href="/signatures?filter=completed" className="block group">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-green-100 hover:shadow-md hover:border-green-200 transition-all duration-200 cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600 group-hover:text-green-600">Completadas</span>
                  <div className="bg-green-50 p-2 rounded-lg group-hover:bg-green-100">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-green-600">{completedSignatures.length}</p>
                <p className="text-xs text-gray-500 mt-1 group-hover:text-green-600">Click para ver todas</p>
              </div>
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pendiente de Firmar */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">Pendiente de Firmar</h2>
                  <p className="text-xs text-gray-500 mt-1">Documentos que debes firmar</p>
                </div>
                <div className="p-6">
                  {myPendingSignatures.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-600">No tienes documentos pendientes</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myPendingSignatures.slice(0, 3).map((sig) => {
                        const mySigner = sig.signers.find(s => s.email === user?.email)
                        return (
                          <Link key={sig.id} href={`/sign/${mySigner?.id}`}>
                            <div className="group p-4 rounded-lg border border-gray-100 hover:border-orange-200 hover:bg-orange-50/50 transition-all cursor-pointer">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-gray-900 truncate group-hover:text-orange-600 transition-colors">
                                    {sig.title}
                                  </h3>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {sig.signers.length} firmante{sig.signers.length > 1 ? 's' : ''}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    Expira: {sig.expiresAt ? new Date(sig.expiresAt).toLocaleDateString('es-CL') : '—'}
                                  </p>
                                </div>
                                <span className="ml-3 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                  Firmar
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

              {/* Esperando Firmas */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">Esperando Firmas</h2>
                  <p className="text-xs text-gray-500 mt-1">Solicitudes que enviaste</p>
                </div>
                <div className="p-6">
                  {sentSignatures.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-600">No hay solicitudes pendientes</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sentSignatures.slice(0, 3).map((sig) => {
                        const pendingCount = sig.signers.filter(s => s.status === 'PENDING').length
                        const signedCount = sig.signers.filter(s => s.status === 'SIGNED').length
                        return (
                          <Link key={sig.id} href={`/signatures/${sig.id}`}>
                            <div className="group p-4 rounded-lg border border-gray-100 hover:border-amber-200 hover:bg-amber-50/50 transition-all cursor-pointer">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-gray-900 truncate group-hover:text-amber-600 transition-colors">
                                    {sig.title}
                                  </h3>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {signedCount} de {sig.signers.length} firmado{sig.signers.length > 1 ? 's' : ''}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    Creada: {new Date(sig.createdAt).toLocaleDateString('es-CL')}
                                  </p>
                                </div>
                                <span className="ml-3 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                  {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
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
            </div>
          )}
        </div>
      </div>
    </>
  )
}
