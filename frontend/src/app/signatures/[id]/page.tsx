'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { signatureApi } from '@/lib/api'
import type { SignatureRequest, ApiError } from '@/types'

export default function SignatureDetailPage() {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : ''
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()
  const [signature, setSignature] = useState<SignatureRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (id) {
      loadSignature()
    }
  }, [id, isAuthenticated])

  const loadSignature = async () => {
    try {
      setLoading(true)
      const data = await signatureApi.getById(id as string) as SignatureRequest
      setSignature(data)
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.message || 'Error al cargar la solicitud de firma')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      EXPIRED: 'bg-red-100 text-red-800',
      REJECTED: 'bg-red-100 text-red-800',
    }
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
  }

  const getSignerStatusIcon = (status: string) => {
    switch (status) {
      case 'SIGNED':
        return '✅'
      case 'PENDING':
        return '⏳'
      case 'REJECTED':
        return '❌'
      default:
        return '📝'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!signature) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card title="Error">
          <p className="text-red-600 mb-4">{error || 'No se encontró la solicitud de firma'}</p>
          <Link href="/dashboard">
            <Button variant="primary">
              Volver al Dashboard
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block"
          >
            ← Volver al Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {signature.title}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(signature.status)}`}>
              {signature.status === 'COMPLETED' ? 'COMPLETADO' : 
               signature.status === 'IN_PROGRESS' ? 'EN PROCESO' : 
               signature.status === 'PENDING' ? 'PENDIENTE' : 
               signature.status}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Información del documento */}
        <Card title="Información del Documento" className="mb-6">
          <div className="space-y-3">
            <div>
              <span className="text-sm font-semibold text-gray-700">Documento ID:</span>
              <span className="ml-2 text-sm text-gray-900">{signature.documentId}</span>
            </div>
            {signature.expiresAt && (
              <div>
                <span className="text-sm font-semibold text-gray-700">Expira:</span>
                <span className="ml-2 text-sm text-gray-900">
                  {new Date(signature.expiresAt).toLocaleString('es-CL')}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Lista de firmantes */}
        <Card title="Firmantes" className="mb-6">
          <div className="space-y-4">
            {signature.signers
              .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
              .map((signer) => {
                const isCurrentUser = user?.email === signer.email
                
                return (
                  <div
                    key={signer.id}
                    className={`p-4 rounded-lg border-2 ${
                      isCurrentUser ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{getSignerStatusIcon(signer.status)}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {signer.fullName}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                                  Tú
                                </span>
                              )}
                            </h3>
                            <p className="text-sm text-gray-600">{signer.email}</p>
                          </div>
                        </div>
                        
                        <div className="mt-2">
                          <span className="text-xs font-medium text-gray-700">
                            Estado: 
                          </span>
                          <span className="ml-1 text-xs text-gray-900">
                            {signer.status === 'SIGNED' ? 'Firmado' : 
                             signer.status === 'PENDING' ? 'Pendiente' : 
                             signer.status === 'REJECTED' ? 'Rechazado' : 
                             signer.status}
                          </span>
                        </div>

                        {signer.signedAt && (
                          <div className="mt-1">
                            <span className="text-xs font-medium text-gray-700">
                              Firmado el: 
                            </span>
                            <span className="ml-1 text-xs text-gray-900">
                              {new Date(signer.signedAt).toLocaleString('es-CL')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Botón para firmar */}
                      {isCurrentUser && signer.status === 'PENDING' && (
                        <div className="ml-4">
                          <p className="text-xs text-gray-700 mb-2 text-right">
                            Usa el enlace que recibiste por correo para firmar
                          </p>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              alert('Por favor, usa el enlace de firma que recibiste por correo electrónico.')
                            }}
                          >
                            📧 Ver instrucciones
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </Card>

        {/* Acciones */}
        <Card title="Acciones">
          <div className="space-y-3">
            <Link href={`/signatures/${signature.id}/view`}>
              <Button variant="secondary" className="w-full">
                👁 Ver Documento
              </Button>
            </Link>
            
            {signature.status === 'COMPLETED' && (
              <Button 
                variant="primary" 
                className="w-full"
                onClick={async () => {
                  try {
                    await signatureApi.downloadSignedPdf(signature.id)
                  } catch (err) {
                    console.error('Error al descargar PDF firmado:', err)
                  }
                }}
              >
                📥 Descargar PDF Firmado
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
