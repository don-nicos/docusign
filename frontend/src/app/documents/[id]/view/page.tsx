'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PDFViewerWithSignaturesWrapper as PDFViewerWithSignatures } from '@/components/pdf/PDFViewerWithSignaturesWrapper'
import { documentApi, signatureApi } from '@/lib/api'
import { useSignaturePositions } from '@/hooks/useSignaturePositions'
import type { Document, SignatureRequest, Signer } from '@/types'

export default function ViewDocumentPage() {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : ''
  const router = useRouter()
  const [document, setDocument] = useState<Document | null>(null)
  const [signatures, setSignatures] = useState<SignatureRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (id) {
      loadDocument()
    }
  }, [id])

  const loadDocument = async () => {
    try {
      setLoading(true)
      const [doc, sigs] = await Promise.all([
        documentApi.getById(id as string) as Promise<Document>,
        signatureApi.listByDocument(id as string) as Promise<SignatureRequest[]>
      ])
      setDocument(doc)
      setSignatures(sigs)
    } catch (err) {
      setError('Error al cargar el documento')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!document) return
    
    // Elegir la solicitud de firma más reciente (si existe)
    if (signatures.length > 0) {
      const latest = [...signatures].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      try {
        await signatureApi.downloadSignedPdf(latest.id)
      } catch (err) {
        console.error('Error al descargar PDF firmado:', err)
      }
      return
    }
    
    // Si no hay solicitudes, descargar el documento original
    const originalUrl = documentApi.getDownloadUrl(document.id)
    window.open(originalUrl, '_blank')
  }

  const handleCreateSignatureRequest = () => {
    router.push(`/documents/${id}/create-signature`)
  }

  // Obtener todas las firmas de todas las solicitudes usando el hook centralizado
  // IMPORTANTE: Debe estar antes de los returns condicionales para cumplir con Rules of Hooks
  const allSigners: Signer[] = signatures.flatMap(sig => sig.signers)
  const allSignatures = useSignaturePositions(allSigners)

  

  // Descargar siempre el original sin firmas (v0)
  const handleDownloadOriginal = async () => {
    if (!document) return
    if (signatures.length > 0) {
      const latest = [...signatures].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      try {
        await signatureApi.downloadPdfVersion(latest.id, 0)
      } catch (err) {
        console.error('Error al descargar PDF original (v0):', err)
      }
      return
    }
    const originalUrl = documentApi.getDownloadUrl(document.id)
    window.open(originalUrl, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Documento no encontrado'}</p>
          <Button onClick={() => router.push('/dashboard')}>
            Volver al Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const completedSignature = signatures.find(s => s.status === 'COMPLETED')
  const isFullySigned = completedSignature !== undefined

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {document.title}
              </h1>
              <p className="text-gray-600 mt-2">
                {document.originalFilename} • {(document.fileSize / 1024).toFixed(1)} KB
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  isFullySigned
                    ? 'bg-green-200 text-green-900'
                    : document.status === 'LOCKED'
                    ? 'bg-yellow-200 text-yellow-900'
                    : 'bg-gray-200 text-gray-900'
                }`}
              >
                {isFullySigned ? '✅ FIRMADO' : document.status === 'LOCKED' ? '🔒 EN PROCESO' : '📄 BORRADOR'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Visor PDF */}
          <div className="lg:col-span-3">
            <Card title="Vista del Documento">
              {allSignatures.length > 0 ? (
                <PDFViewerWithSignatures
                  fileUrl={`${documentApi.getViewUrl(document.id)}?t=${Date.now()}`}
                  signatures={allSignatures}
                  className="h-[800px] overflow-auto"
                  showInstructions={false}
                />
              ) : (
                <div className="relative">
                  <iframe
                    src={`${documentApi.getViewUrl(document.id)}?t=${Date.now()}#toolbar=0`}
                    className="w-full h-[800px] border-0 rounded-lg"
                    title={document.title}
                  />
                </div>
              )}
            </Card>
          </div>

          {/* Panel de acciones */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              {/* Acciones del documento */}
              <Card title="Acciones">
                <div className="space-y-3">
                  <Button
                    variant="primary"
                    onClick={handleDownload}
                    className="w-full"
                  >
                    📥 {isFullySigned ? 'Descargar PDF Firmado' : 'Descargar Original'}
                  </Button>
                  
                  {!document.status || document.status === 'DRAFT' && (
                    <Button
                      variant="secondary"
                      onClick={() => router.push(`/documents/${id}/create-signature`)}
                      className="w-full"
                    >
                      ✍️ Crear Solicitud de Firma
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    onClick={() => router.push('/dashboard')}
                    className="w-full"
                  >
                    ← Volver al Dashboard
                  </Button>
                </div>
              </Card>

              {/* Estado de firmas */}
              {signatures.length > 0 && (
                <Card title="Estado de Firmas">
                  <div className="space-y-3">
                    {signatures.map(sig => (
                      <div key={sig.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{sig.title}</span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              sig.status === 'COMPLETED'
                                ? 'bg-green-200 text-green-900'
                                : sig.status === 'IN_PROGRESS'
                                ? 'bg-yellow-200 text-yellow-900'
                                : 'bg-gray-200 text-gray-900'
                            }`}
                          >
                            {sig.status === 'COMPLETED' ? 'COMPLETO' : sig.status === 'IN_PROGRESS' ? 'EN PROCESO' : 'PENDIENTE'}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {sig.signers.map(signer => (
                            <div key={signer.id} className="flex items-center justify-between text-xs">
                              <div className="flex items-center min-w-0">
                                <span className="text-black truncate font-medium">{signer.fullName}</span>
                                <span className="text-black ml-2">({signer.email})</span>
                                {signer.status === 'SIGNED' && signer.signedAt && (
                                  <span className="text-black ml-2">
                                    • {new Date(signer.signedAt).toLocaleString('es-CL')}
                                  </span>
                                )}
                              </div>
                              <span
                                className={`font-semibold ${
                                  signer.status === 'SIGNED'
                                    ? 'text-green-700'
                                    : 'text-black'
                                }`}
                              >
                                {signer.status === 'SIGNED' ? '✓' : '○'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Información del documento */}
              <Card title="Información">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Creado:</span>
                    <span className="text-gray-600 ml-2">
                      {new Date(document.createdAt).toLocaleDateString('es-CL')}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Actualizado:</span>
                    <span className="text-gray-600 ml-2">
                      {new Date(document.updatedAt).toLocaleDateString('es-CL')}
                    </span>
                  </div>
                  {isFullySigned && completedSignature?.completedAt && (
                    <div>
                      <span className="font-medium text-gray-700">Firmado:</span>
                      <span className="text-gray-600 ml-2">
                        {new Date(completedSignature.completedAt).toLocaleDateString('es-CL')}
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
