'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { documentApi, signatureApi } from '@/lib/api'
import type { Document, SignatureRequest, ApiError } from '@/types'

export default function DocumentDetailPage() {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : ''
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [document, setDocument] = useState<Document | null>(null)
  const [signatures, setSignatures] = useState<SignatureRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (id) {
      loadDocument()
    }
  }, [id, isAuthenticated])

  const loadDocument = async () => {
    try {
      setLoading(true)
      const [docData, sigData] = await Promise.all([
        documentApi.getById(id as string) as Promise<Document>,
        signatureApi.listByDocument(id as string) as Promise<SignatureRequest[]>,
      ])
      setDocument(docData)
      setSignatures(sigData)
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.message || 'Error al cargar el documento')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!document) return
    if (signatures.length > 0) {
      const latest = [...signatures].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      try {
        await signatureApi.downloadSignedPdf(latest.id)
      } catch (err) {
        console.error('Error al descargar PDF firmado:', err)
      }
      return
    }
    window.open(documentApi.getDownloadUrl(document.id), '_blank')
  }

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
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Error al cargar el documento
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link href="/dashboard">
              <Button variant="primary">Volver al dashboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 text-sm">
          ← Volver al dashboard
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {document.title}
                </h1>
                <p className="text-gray-800">{document.originalFilename}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  document.status === 'DRAFT'
                    ? 'bg-gray-200 text-gray-800'
                    : document.status === 'LOCKED'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {document.status === 'DRAFT' ? 'BORRADOR' :
                 document.status === 'LOCKED' ? 'EN FIRMA' :
                 document.status === 'ARCHIVED' ? 'ARCHIVADO' : document.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600 mb-1">Tamaño</p>
                <p className="font-semibold text-gray-900">{(document.fileSize / 1024).toFixed(1)} KB</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Tipo</p>
                <p className="font-semibold text-gray-900">{document.contentType || 'application/pdf'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Creado</p>
                <p className="font-semibold text-gray-900">
                  {new Date(document.createdAt).toLocaleDateString('es-CL')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Modificado</p>
                <p className="font-semibold text-gray-900">
                  {new Date(document.updatedAt).toLocaleDateString('es-CL')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="primary" onClick={handleDownload}>
                {signatures.length > 0 ? 'Descargar PDF Firmado' : 'Descargar PDF'}
              </Button>
              {signatures.length > 0 && (
                <Button variant="secondary" onClick={handleDownloadOriginal}>
                  📄 Descargar Original
                </Button>
              )}
              {document.status === 'DRAFT' && (
                <Link href={`/documents/${document.id}/create-signature`}>
                  <Button variant="secondary">
                    ✍️ Crear solicitud de firma
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        </div>

        <div>
          <Card title="Información">
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Hash SHA-256</p>
                <p className="font-mono text-xs break-all bg-gray-50 p-3 rounded text-gray-900 border border-gray-200">
                  {document.hashSha256}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">ID</p>
                <p className="font-mono text-xs break-all bg-gray-50 p-3 rounded text-gray-900 border border-gray-200">
                  {document.id}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
