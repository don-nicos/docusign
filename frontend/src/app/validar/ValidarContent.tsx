'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { signatureApi } from '@/lib/api'
import type { SignatureVerificationResponse, SignerVerificationResponse } from '@/types'

function formatDate(value?: string | null) {
  if (!value) return 'N/A'
  try {
    return new Date(value).toLocaleString('es-CL', {
      timeZone: 'America/Santiago',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toUpperCase() || 'PENDING'
  const colorClass =
    normalized === 'COMPLETED'
      ? 'bg-green-100 text-green-800 border-green-300'
      : normalized === 'IN_PROGRESS'
      ? 'bg-blue-100 text-blue-800 border-blue-300'
      : normalized === 'SIGNED'
      ? 'bg-green-100 text-green-800 border-green-300'
      : 'bg-gray-100 text-gray-800 border-gray-300'

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${colorClass}`}>
      {normalized === 'COMPLETED' ? 'Completado' : normalized === 'IN_PROGRESS' ? 'En progreso' : normalized === 'SIGNED' ? 'Firmado' : normalized}
    </span>
  )
}

function SignerCard({ signer, index }: { signer: SignerVerificationResponse; index: number }) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">
          {index + 1}. {signer.fullName}
        </h3>
        <StatusBadge status={signer.status} />
      </div>
      <div className="space-y-1 text-sm text-gray-700">
        <p><span className="font-medium">Email:</span> {signer.email}</p>
        <p><span className="font-medium">Fecha de firma:</span> {formatDate(signer.signedAt)}</p>
        <p><span className="font-medium">Método:</span> {signer.authenticationMethod || 'N/A'}</p>
        <p><span className="font-medium">IP:</span> {signer.ipAddress || 'N/A'}</p>
      </div>
    </div>
  )
}

export function ValidarContent() {
  const searchParams = useSearchParams()
  const initialRequestId = searchParams?.get('rid') || ''
  const initialSignerId = searchParams?.get('sid') || undefined

  const [inputValue, setInputValue] = useState(initialRequestId)
  const [data, setData] = useState<SignatureVerificationResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const verify = async (rid: string, sid?: string) => {
    if (!rid.trim()) return
    setLoading(true)
    setError('')
    setData(null)
    try {
      const result = await signatureApi.verifySignature(rid.trim(), sid)
      setData(result)
    } catch (err) {
      const apiError = err as { message?: string }
      setError(apiError.message || 'No se pudo verificar la firma. Verifica el ID de la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialRequestId) {
      verify(initialRequestId, initialSignerId)
    }
  }, [initialRequestId, initialSignerId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    verify(inputValue)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Validación de Firma Digital</h1>
          <p className="text-gray-600 mt-2">
            Verifica que un documento fue firmado a través de Docusing.
          </p>
        </div>

        <Card title="Ingresar solicitud">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              type="text"
              placeholder="ID de la solicitud (rid)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Verificando...' : 'Verificar'}
            </Button>
          </form>
        </Card>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {data && (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <div className="text-2xl">✅</div>
              <div>
                <h2 className="font-semibold text-green-900">Documento verificado por Docusing</h2>
                <p className="text-sm text-green-800">
                  La solicitud <code className="bg-green-100 px-1 rounded">{data.requestId}</code> existe en nuestro sistema.
                </p>
              </div>
            </div>

            <Card title="Detalles del documento">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Título</p>
                  <p className="text-gray-900">{data.documentTitle}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Estado</p>
                  <StatusBadge status={data.status} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Completado</p>
                  <p className="text-gray-900">{formatDate(data.completedAt)}</p>
                </div>
                {data.documentHash && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Hash SHA-256</p>
                    <code className="block text-xs bg-gray-100 p-2 rounded break-all text-gray-800">
                      {data.documentHash}
                    </code>
                  </div>
                )}
              </div>
            </Card>

            <Card title="Firmantes">
              <div className="space-y-4">
                {data.signers.length === 0 ? (
                  <p className="text-gray-600">No hay firmantes registrados en esta solicitud.</p>
                ) : (
                  data.signers.map((signer, index) => (
                    <SignerCard key={signer.signerId} signer={signer} index={index} />
                  ))
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
