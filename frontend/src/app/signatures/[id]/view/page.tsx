'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PDFViewerWithSignaturesWrapper as PDFViewerWithSignatures } from '@/components/pdf/PDFViewerWithSignaturesWrapper'
import { signatureApi, documentApi } from '@/lib/api'
import { useSignaturePositions } from '@/hooks/useSignaturePositions'
import type { SignatureRequest } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

export default function ViewSignaturePage() {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : ''
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [signature, setSignature] = useState<SignatureRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Proteger ruta: redirigir si no está autenticado
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/signatures/' + id + '/view')
    }
  }, [isAuthenticated, router, id])

  useEffect(() => {
    if (id && isAuthenticated) {
      loadSignature()
    }
  }, [id, isAuthenticated])

  const loadSignature = async () => {
    try {
      setLoading(true)
      const sig = await signatureApi.getById(id as string) as SignatureRequest
      setSignature(sig)
    } catch (err) {
      setError('Error al cargar la solicitud de firma')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadSigned = async () => {
    if (!signature) return
    try {
      await signatureApi.downloadSignedPdf(signature.id)
    } catch (err) {
      console.error('Error al descargar PDF firmado:', err)
    }
  }

  const handleDownloadOriginal = async () => {
    if (!signature) return
    try {
      await signatureApi.downloadPdfVersion(signature.id, 0)
    } catch (err) {
      console.error('Error al descargar PDF original (v0):', err)
    }
  }

  const handleSign = () => {
    if (!signature || !user) return
    
    // Encontrar si el usuario actual es un firmante
    const currentSigner = signature.signers.find(s => 
      s.email.toLowerCase() === user.email?.toLowerCase()
    )
    
    if (currentSigner && currentSigner.status !== 'SIGNED') {
      router.push(`/sign/${currentSigner.id}`)
    }
  }

  // Preparar datos de firmas para el visor usando el hook centralizado
  // IMPORTANTE: Debe estar antes de los returns condicionales para cumplir con Rules of Hooks
  const signatures = useSignaturePositions(signature?.signers || [])
  
  // Debug: Ver cuántas posiciones se generaron
  console.log('🔍 DEBUG - Firmantes:', signature?.signers?.length)
  console.log('🔍 DEBUG - Posiciones generadas:', signatures.length)
  console.log('🔍 DEBUG - Datos completos:', JSON.stringify(signatures, null, 2))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !signature) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Solicitud no encontrada'}</p>
          <Button onClick={() => router.push('/dashboard')}>
            Volver al Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const isComplete = signature.status === 'COMPLETED'
  const inProgress = signature.status === 'IN_PROGRESS'
  const documentUrl = documentApi.getViewUrl(signature.documentId)
  
  // Verificar si hay al menos una firma
  const hasSomeSignatures = signature.signers.some(s => s.status === 'SIGNED')
  
  // Verificar si el usuario actual necesita firmar
  const currentSigner = user ? signature.signers.find(s => 
    s.email.toLowerCase() === user.email?.toLowerCase()
  ) : null
  const needsToSign = currentSigner && currentSigner.status !== 'SIGNED'

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {signature.title}
              </h1>
              <p className="text-gray-600 mt-2">
                {signature.signers.length} firmante(s) • {signature.signers.filter(s => s.status === 'SIGNED').length} firmado(s)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  isComplete
                    ? 'bg-green-200 text-green-900'
                    : inProgress
                    ? 'bg-yellow-200 text-yellow-900'
                    : 'bg-gray-200 text-gray-900'
                }`}
              >
                {isComplete ? '✅ COMPLETADO' : inProgress ? '⏳ EN PROCESO' : '📝 PENDIENTE'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Visor PDF */}
          <div className="lg:col-span-3">
            <Card title="Documento">
              <PDFViewerWithSignatures
                fileUrl={documentUrl}
                signatures={signatures}
                pdfViewerWidth={signature.pdfViewerWidth}
                className="h-[800px] overflow-auto"
                showInstructions={false}
              />
            </Card>
          </div>

          {/* Panel lateral */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              {/* Acciones */}
              <Card title="Acciones">
                <div className="space-y-3">
                  {needsToSign && (
                    <Button
                      variant="primary"
                      onClick={handleSign}
                      className="w-full"
                    >
                      ✍️ Firmar Documento
                    </Button>
                  )}
                  
                  {/* Mostrar botón de descarga si hay al menos una firma */}
                  {hasSomeSignatures && (
                    <Button
                      variant="primary"
                      onClick={handleDownloadSigned}
                      className="w-full"
                    >
                      {isComplete ? '📥 Descargar PDF Firmado (Completo)' : '📥 Descargar PDF con Firmas Actuales'}
                    </Button>
                  )}
                  
                  <Button
                    variant={hasSomeSignatures ? "secondary" : "primary"}
                    onClick={handleDownloadOriginal}
                    className="w-full"
                  >
                    📄 Descargar Original
                  </Button>
                  
                  <Button
                    variant="ghost"
                    onClick={() => router.push('/dashboard')}
                    className="w-full"
                  >
                    ← Volver al Dashboard
                  </Button>
                </div>
              </Card>

              {/* Estado de firmantes */}
              <Card title="Firmantes">
                <div className="space-y-3">
                  {signature.signers.map((signer, index) => (
                    <div
                      key={signer.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {index + 1}. {signer.fullName}
                          </span>
                          {signer.email === user?.email && (
                            <span className="text-xs bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full font-semibold">
                              TÚ
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {signer.email}
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span
                          className={`text-lg font-bold ${
                            signer.status === 'SIGNED'
                              ? 'text-green-600'
                              : signer.status === 'REJECTED'
                              ? 'text-red-600'
                              : 'text-gray-400'
                          }`}
                        >
                          {signer.status === 'SIGNED' ? '✓' : signer.status === 'REJECTED' ? '✗' : '○'}
                        </span>
                        {signer.signedAt && (
                          <span className="text-xs text-gray-500">
                            {new Date(signer.signedAt).toLocaleDateString('es-CL')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Información de la solicitud */}
              <Card title="Información">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Creada:</span>
                    <span className="text-gray-600 ml-2">
                      {new Date(signature.createdAt).toLocaleDateString('es-CL')}
                    </span>
                  </div>
                  {signature.expiresAt && (
                    <div>
                      <span className="font-medium text-gray-700">Expira:</span>
                      <span className="text-gray-600 ml-2">
                        {new Date(signature.expiresAt).toLocaleDateString('es-CL')}
                      </span>
                    </div>
                  )}
                  {signature.completedAt && (
                    <div>
                      <span className="font-medium text-gray-700">Completada:</span>
                      <span className="text-gray-600 ml-2">
                        {new Date(signature.completedAt).toLocaleDateString('es-CL')}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
