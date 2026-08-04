'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PDFViewerWithSignaturesWrapper as PDFViewerWithSignatures } from '@/components/pdf/PDFViewerWithSignaturesWrapper'
import { SignatureCaptureModal } from '@/components/signature/SignatureCaptureModal'
import { signatureApi, documentApi } from '@/lib/api'
import { useSignaturePositions } from '@/hooks/useSignaturePositions'
import type { ApiError } from '@/types'

interface Signer {
  id: string
  email: string
  fullName: string
  status: string
  orderIndex?: number
  signatureImagePath?: string
  // Legacy fields
  signaturePositionX?: number
  signaturePositionY?: number
  signaturePage?: number
  signatureWidth?: number
  signatureHeight?: number
  // New system: multiple positions
  positions?: Array<{
    pageNumber: number
    positionX: number
    positionY: number
    width: number
    height: number
    label?: string
  }>
  signaturePositions?: Array<{
    pageNumber: number
    positionX: number
    positionY: number
    width: number
    height: number
    label?: string
  }>
}

interface SignatureRequest {
  id: string
  documentId: string
  title: string
  status: string
  signers: Signer[]
  pdfViewerWidth?: number
  updatedAt?: string
  createdAt?: string
}

interface SignerInfo {
  signer: Signer
  signatureRequest: SignatureRequest
  documentUrl: string
}

export default function SignDocumentPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const token = searchParams?.get('token')
  const signerId = typeof params?.signerId === 'string' ? params.signerId : Array.isArray(params?.signerId) ? params.signerId[0] : ''
  const [signerInfo, setSignerInfo] = useState<SignerInfo | null>(null)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('')
  const [tempSignatureDataUrl, setTempSignatureDataUrl] = useState<string>('')
  // OTP eliminado del sistema
  const [step, setStep] = useState<'view' | 'preview' | 'capture' | 'verify'>('view')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  // Permitir firma simultánea - no verificar turnos
  const isMyTurn = true

  // Preparar posiciones de firma usando el hook centralizado
  // IMPORTANTE: Debe estar antes de los returns condicionales para cumplir con Rules of Hooks
  // Solo mostrar preview si NO está firmado aún (evitar duplicados)
  const currentSigner = signerInfo?.signatureRequest.signers.find(s => s.id === signerId)
  const isAlreadySigned = currentSigner?.status === 'SIGNED'
  
  const signaturePositions = useSignaturePositions(
    signerInfo?.signatureRequest.signers ?? [],
    (!isAlreadySigned && (tempSignatureDataUrl || signatureDataUrl)) ? {
      signerId,
      signatureDataUrl: tempSignatureDataUrl || signatureDataUrl
    } : undefined
  )

  useEffect(() => {
    if (signerId && searchParams !== null) {
      loadSignatureData()
    }
  }, [signerId, searchParams])

  const loadSignatureData = async () => {
    try {
      setLoading(true)
      setError('')

      // Obtener información completa del firmante
      // Token es opcional: si está presente, usar magic link; si no, usar autenticación del usuario
      const info = await signatureApi.getSignerInfo(signerId, token || undefined) as SignerInfo
      setSignerInfo(info)
      
      // Determinar el paso inicial
      if (info.signer.status === 'SIGNED') {
        setSuccess('Este documento ya ha sido firmado')
        setStep('view')
      } else {
        setStep('view')
      }
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.message || 'Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const refreshSignerInfo = async () => {
    try {
      const info = await signatureApi.getSignerInfo(signerId, token || undefined) as SignerInfo
      setSignerInfo(info)
      if (info.signer.status === 'SIGNED') {
        setSignatureDataUrl('')
        setTempSignatureDataUrl('')
      }
    } catch {
      // No borrar el mensaje de éxito si la recarga falla
    }
  }

  // handleRequestOtp eliminado - OTP no se usa

  const handleCaptureSignature = () => {
    setShowSignatureModal(true)
  }

  const handleSaveSignature = async (dataUrl: string, method: 'draw' | 'type' | 'saved') => {
    console.log('handleSaveSignature called', { method, dataUrlLength: dataUrl.length })
    setShowSignatureModal(false)
    setTempSignatureDataUrl(dataUrl)
    setStep('preview')
    setShowPreview(true)
    console.log('State updated: step=preview, showPreview=true')
  }

  const handleConfirmSignature = async () => {
    setActionLoading(true)
    setError('')
    setSuccess('')

    try {
      // Subir imagen de firma al backend
      await signatureApi.uploadSignature(signerId as string, tempSignatureDataUrl, 'draw')
      setSignatureDataUrl(tempSignatureDataUrl)

      // Firmar directamente sin paso adicional
      await signatureApi.sign(signerId as string, '')
      setSuccess('¡Documento firmado exitosamente!')

      // Recargar datos del firmante para obtener el PDF firmado actualizado
      await refreshSignerInfo()

      setStep('view')
      setShowPreview(false)
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.message || 'Error al firmar el documento')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRedoSignature = () => {
    setTempSignatureDataUrl('')
    setStep('view')
    setShowPreview(false)
    handleCaptureSignature()
  }

  const handleVerifyAndSign = async () => {
    setError('')
    setSuccess('')
    setActionLoading(true)

    try {
      // Firmar directamente sin OTP
      await signatureApi.sign(signerId as string, '')
      setSuccess('¡Documento firmado exitosamente!')

      // Recargar datos del firmante para obtener el PDF firmado actualizado
      await refreshSignerInfo()

      setStep('view')
      setShowPreview(false)
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.message || 'Error al firmar el documento.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDownloadSigned = async () => {
    if (!signerInfo) return
    
    try {
      await signatureApi.downloadSignedPdf(signerInfo.signatureRequest.id)
    } catch (err) {
      setError('Error al descargar el documento firmado')
    }
  }

  const fileUrl = useMemo(() => {
    if (!signerInfo?.signatureRequest.documentId) return ''
    const baseUrl = documentApi.getViewUrl(signerInfo.signatureRequest.documentId)
    const cacheBuster = signerInfo.signatureRequest.updatedAt
    return cacheBuster ? `${baseUrl}?t=${encodeURIComponent(cacheBuster)}` : baseUrl
  }, [signerInfo?.signatureRequest.documentId, signerInfo?.signatureRequest.updatedAt])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {signerInfo?.signatureRequest.title || 'Firma de Documento'}
          </h1>
          <p className="text-gray-600 mt-2">
            {signerInfo?.signer.status === 'SIGNED' 
              ? '✅ Documento firmado exitosamente'
              : 'Revisa el documento y captura tu firma en la zona indicada'}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Visor PDF con posiciones de firma */}
          <div className="lg:col-span-3">
            <Card title="Documento a Firmar">
              {signerInfo ? (
                <PDFViewerWithSignatures
                  fileUrl={fileUrl}
                  signatures={signaturePositions}
                  pdfViewerWidth={signerInfo.signatureRequest.pdfViewerWidth}
                  currentSignerId={signerId as string}
                  className="h-[800px] overflow-auto"
                  showInstructions={!showPreview}
                />
              ) : (
                <div className="h-[600px] flex items-center justify-center bg-gray-100 rounded-lg">
                  <div className="text-center">
                    <svg
                      className="w-16 h-16 mx-auto mb-4 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-gray-600">
                      Cargando documento...
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Panel de acciones */}
          <div className="lg:col-span-1">
            <Card title="Acciones de Firma">
              <div className="space-y-6">
                {/* Si ya está firmado, mostrar mensaje */}
                {signerInfo?.signer.status === 'SIGNED' ? (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Documento Firmado
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Has firmado este documento exitosamente.
                    </p>
                    
                    <div className="space-y-3">
                      <Button
                        variant="primary"
                        onClick={handleDownloadSigned}
                        className="w-full"
                      >
                        📥 Descargar Documento Firmado
                      </Button>
                      
                      {signerInfo.signatureRequest.status === 'COMPLETED' && (
                        <div className="p-3 bg-green-50 border border-green-300 rounded-lg">
                          <p className="text-sm text-green-800 font-medium">
                            ✅ Todas las firmas completadas
                          </p>
                          <p className="text-xs text-green-700 mt-1">
                            El documento ha sido firmado por todos los participantes.
                          </p>
                        </div>
                      )}
                      
                      <Button
                        variant="ghost"
                        onClick={() => router.push('/dashboard')}
                        className="w-full"
                      >
                        Volver al Dashboard
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Vista previa de firma */}
                    {step === 'preview' && showPreview && (
                      <div>
                        <div className="flex items-center mb-4">
                          <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                            👁
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Vista Previa de tu Firma
                          </h3>
                        </div>
                        
                        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
                          <p className="text-sm text-yellow-800 font-medium mb-2">
                            ⚠️ Así se verá tu firma en el documento
                          </p>
                          <p className="text-sm text-yellow-700">
                            Revisa cómo queda tu firma en la posición marcada en azul.
                          </p>
                        </div>

                        {tempSignatureDataUrl && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Tu firma capturada:
                            </p>
                            <div className="border-2 border-gray-200 rounded-lg bg-white p-2 flex items-center justify-center min-h-[120px]">
                              <img
                                src={tempSignatureDataUrl}
                                alt="Vista previa de tu firma"
                                className="w-full h-auto object-contain"
                              />
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Button
                            variant="primary"
                            onClick={handleConfirmSignature}
                            disabled={actionLoading || !isMyTurn}
                            className="w-full"
                          >
                            ✅ Confirmar y Firmar Documento
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={handleRedoSignature}
                            disabled={actionLoading}
                            className="w-full"
                          >
                            🔄 Rehacer Firma
                          </Button>
                        </div>

                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs text-blue-700">
                            <strong>Nota:</strong> Mira el documento a la izquierda para ver cómo quedará tu firma.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Paso 1: Capturar firma */}
                    {step === 'view' && !showPreview && (
                  <div>
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                        1
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Captura tu Firma
                      </h3>
                    </div>
                    <p className="text-sm text-gray-700 mb-4">
                      Dibuja tu firma con el mouse o escribe tu nombre para generar una firma tipográfica.
                    </p>
                    {signatureDataUrl ? (
                      <div className="mb-4">
                        <p className="text-sm text-green-600 font-medium mb-2">
                          ✓ Firma capturada
                        </p>
                        <div className="border-2 border-green-200 rounded-lg bg-white p-2 flex items-center justify-center mb-2 min-h-[120px]">
                          <img
                            src={signatureDataUrl}
                            alt="Tu firma"
                            className="w-full h-auto object-contain"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          onClick={handleCaptureSignature}
                          disabled={actionLoading}
                          className="mt-2 w-full"
                        >
                          Cambiar firma
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={handleCaptureSignature}
                        disabled={actionLoading}
                        className="w-full"
                      >
                        ✍️ Capturar Firma
                      </Button>
                    )}
                  </div>
                    )}

                    {/* Paso 2: Confirmar firma */}
                {step === 'verify' && (
                  <div>
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                        2
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Confirmar Firma
                      </h3>
                    </div>
                    
                    {signatureDataUrl && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-900 font-semibold mb-2">
                          Tu firma:
                        </p>
                        <div className="border-2 border-gray-200 rounded-lg bg-white p-2 flex items-center justify-center mb-4 min-h-[120px]">
                          <img
                            src={signatureDataUrl}
                            alt="Tu firma"
                            className="w-full h-auto object-contain"
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Botón de firma simple */}
                    <Button
                      variant="primary"
                      onClick={handleVerifyAndSign}
                      disabled={actionLoading || !isMyTurn}
                      className="w-full"
                    >
                      {actionLoading ? 'Firmando...' : '✔️ Firmar Documento'}
                    </Button>
                    
                    <p className="text-xs text-gray-700 mt-3 text-center font-medium">
                      Al firmar, aceptas que este documento es válido y vinculante
                    </p>
                  </div>
                    )}
                  </>
                )}

                {/* Instrucciones - Solo mostrar si no está firmado */}
                {signerInfo?.signer.status !== 'SIGNED' && (
                <div className="pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    📋 Instrucciones:
                  </h4>
                  <ol className="text-sm text-gray-600 space-y-2">
                    <li>1. Revisa el documento completo</li>
                    <li>2. Captura tu firma (dibujar o escribir)</li>
                    <li>3. Confirma para firmar el documento</li>
                  </ol>
                </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal de captura de firma */}
      <SignatureCaptureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSave={handleSaveSignature}
        signerName={signerInfo?.signer.fullName || ''}
      />
    </div>
  )
}
