'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { signatureApi } from '@/lib/api'
import type { SignatureRequest } from '@/types'

export default function SignaturesPage() {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [signatures, setSignatures] = useState<SignatureRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadSignatures()
    }
  }, [isAuthenticated])

  const loadSignatures = async () => {
    try {
      setLoading(true)
      const [created, toSign] = await Promise.all([
        signatureApi.list() as Promise<SignatureRequest[]>,
        signatureApi.listMyRequests() as Promise<SignatureRequest[]>,
      ])
      
      // Combinar y eliminar duplicados
      const allSigs = [...created, ...toSign]
      const uniqueSigs = allSigs.filter((sig, index, self) => 
        index === self.findIndex(s => s.id === sig.id)
      )
      
      setSignatures(uniqueSigs)
    } catch (e) {
      console.error(e)
      setError('Error al cargar solicitudes de firma')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-200 text-green-900'
      case 'IN_PROGRESS':
        return 'bg-yellow-200 text-yellow-900'
      case 'PENDING':
        return 'bg-gray-200 text-gray-900'
      case 'REJECTED':
        return 'bg-red-200 text-red-900'
      default:
        return 'bg-gray-200 text-gray-900'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return '✅ Completado'
      case 'IN_PROGRESS':
        return '⏳ En proceso'
      case 'PENDING':
        return '📝 Pendiente'
      case 'REJECTED':
        return '❌ Rechazado'
      default:
        return status
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Solicitudes de Firma</h1>
        <Link href="/dashboard">
          <Button variant="ghost">← Volver al Dashboard</Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <Card>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Cargando...</p>
          </div>
        ) : signatures.length === 0 ? (
          <div className="text-center py-12 text-gray-700">
            <p>No tienes solicitudes de firma</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {signatures.map((sig) => {
              const currentSigner = user ? sig.signers.find(s => 
                s.email.toLowerCase() === user.email?.toLowerCase()
              ) : null
              const needsToSign = currentSigner && currentSigner.status !== 'SIGNED'
              
              return (
                <div key={sig.id} className="py-4 flex items-center justify-between hover:bg-gray-50 px-2 rounded transition-colors">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{sig.title}</h3>
                    <p className="text-sm text-gray-700">
                      {sig.signers.length} firmante(s) • {sig.signers.filter(s => s.status === 'SIGNED').length} firmado(s)
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Creada: {new Date(sig.createdAt).toLocaleDateString('es-CL')}
                    </p>
                    {needsToSign && (
                      <p className="text-xs text-blue-600 font-semibold mt-1">
                        ✍️ Pendiente de tu firma
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(sig.status)}`}>
                      {getStatusText(sig.status)}
                    </span>
                    {needsToSign ? (
                      <Link href={`/sign/${currentSigner.id}`}>
                        <Button variant="primary" size="sm">
                          Firmar
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/signatures/${sig.id}/view`}>
                        <Button variant="ghost" size="sm">
                          Ver
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
