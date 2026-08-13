'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SignatureFieldPlacer } from '@/components/signature/SignatureFieldPlacer'
import { documentApi, paymentApi, signatureApi, userApi } from '@/lib/api'
import { API_CONFIG } from '@/lib/config'
import { PDF_VIEWER_WIDTH } from '@/lib/pdfConstants'
import type { Document, SignatureRequest, ApiError, CreateSignatureRequestPayload, User } from '@/types'

interface SignerInput {
  email: string
  fullName: string
  signaturePositionX?: number
  signaturePositionY?: number
  signaturePage?: number
  signatureWidth?: number
  signatureHeight?: number
}

interface SignatureField {
  signerId: string
  signerName: string
  x: number
  y: number
  width: number
  height: number
  page: number
}

export default function CreateSignaturePage() {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : ''
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [document, setDocument] = useState<Document | null>(null)
  const [loadingAccess, setLoadingAccess] = useState(true)
  const [hasAccessToCreate, setHasAccessToCreate] = useState(false)

  // Función de validación de email
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !email.trim()) {
      return { valid: false, message: 'El email es requerido' }
    }
    if (!emailRegex.test(email)) {
      return { valid: false, message: 'El email no es válido' }
    }
    return { valid: true, message: '' }
  }
  const [title, setTitle] = useState('')
  const [signers, setSigners] = useState<SignerInput[]>([
    { email: '', fullName: '' },
  ])
  const [expirationHours, setExpirationHours] = useState(72)
  const [loading, setLoading] = useState(false)
  const [loadingDoc, setLoadingDoc] = useState(true)
  const [error, setError] = useState('')
  const [currentStep, setCurrentStep] = useState<'signers' | 'positions'>('signers')
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([])

  const loadSubscriptionAccess = useCallback(async () => {
    try {
      setLoadingAccess(true)
      const [count, subscription] = await Promise.all([
        documentApi.count(),
        paymentApi.getMySubscription(),
      ])
      const active = subscription?.subscription?.status === 'ACTIVE'
      setHasAccessToCreate(count.count <= 3 || active)
    } catch {
      setHasAccessToCreate(false)
    } finally {
      setLoadingAccess(false)
    }
  }, [])

  const loadDocument = useCallback(async () => {
    try {
      setLoadingDoc(true)
      const docData = await documentApi.getById(id as string) as Document
      setDocument(docData)
      setTitle(`Solicitud de firma: ${docData.title}`)
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.message || 'Error al cargar el documento')
    } finally {
      setLoadingDoc(false)
    }
  }, [id, setError, setDocument, setTitle, setLoadingDoc])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (authLoading) return

    loadSubscriptionAccess()

    if (id && isAuthenticated) {
      loadDocument()
    }
  }, [id, isAuthenticated, authLoading, loadDocument, loadSubscriptionAccess, router])

  const addSigner = () => {
    setSigners([...signers, { email: '', fullName: '' }])
  }

  const removeSigner = (index: number) => {
    if (signers.length > 1) {
      setSigners(signers.filter((_, i) => i !== index))
    }
  }

  const updateSigner = async (index: number, field: keyof SignerInput, value: string | number) => {
    const updated = [...signers]
    if (field === 'fullName' || field === 'email') {
      updated[index][field] = value as string
    } else {
      updated[index][field] = value as number
    }
    setSigners(updated)

    // Si se está actualizando el email, intentar autocompletar
    if (field === 'email' && typeof value === 'string') {
      const email = value.trim()
      // Validar que sea un email válido antes de buscar
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (emailRegex.test(email)) {
        try {
          const userData = await userApi.getUserByEmail(email) as User
          if (userData) {
            // Autocompletar nombres si existen
            const fullName = userData.fullName || 
                            `${userData.firstName || ''} ${userData.lastName || ''} ${userData.secondLastName || ''}`.trim()
            
            if (fullName) {
              const updatedWithName = [...updated]
              updatedWithName[index].fullName = fullName
              setSigners(updatedWithName)
            }
          }
        } catch (err) {
          // Usuario no encontrado, no hacer nada
          console.log('Usuario no encontrado en el sistema')
        }
      }
    }
  }

  const handleContinueToPositions = () => {
    setError('')

    // Validaciones
    if (signers.length === 0) {
      setError('Debes agregar al menos un firmante')
      return
    }

    for (let i = 0; i < signers.length; i++) {
      if (!signers[i].email || !signers[i].fullName) {
        setError(`Por favor completa los datos del firmante ${i + 1}`)
        return
      }
      
      // Validar email
      const emailValidation = validateEmail(signers[i].email)
      if (!emailValidation.valid) {
        setError(`Firmante ${i + 1}: ${emailValidation.message}`)
        return
      }
    }

    setCurrentStep('positions')
  }

  const handleFieldsChange = useCallback((fields: SignatureField[]) => {
    setSignatureFields(fields)
  }, [])

  const handleSubmit = async () => {
    setError('')
    setLoading(true)

    try {
      // Validar que TODOS los firmantes tengan al menos una posición de firma
      const signersWithoutPositions = signers.filter((signer, index) => {
        const fields = signatureFields.filter(f => f.signerId === index.toString())
        return fields.length === 0
      })

      if (signersWithoutPositions.length > 0) {
        const names = signersWithoutPositions.map(s => s.fullName).join(', ')
        setError(`Debes posicionar al menos un campo de firma para: ${names}`)
        return
      }

      // Mapear campos de firma a los firmantes (soportar múltiples posiciones)
      const signersWithPositions = signers.map((signer, index) => {
        const fields = signatureFields.filter(f => f.signerId === index.toString())
        
        // Ahora siempre hay posiciones (validado arriba)
        return {
          email: signer.email.toLowerCase(),
          fullName: signer.fullName,
          orderIndex: index,
          positions: fields.map(field => ({
            pageNumber: field.page,
            positionX: field.x,
            positionY: field.y,
            width: field.width,
            height: field.height,
            label: `Firma ${fields.indexOf(field) + 1}`
          }))
        }
      })

      const payload: CreateSignatureRequestPayload = {
        documentId: id as string,
        title,
        signers: signersWithPositions,
        expirationHours,
        pdfViewerWidth: PDF_VIEWER_WIDTH,
      }

      console.log('Payload enviado:', JSON.stringify(payload, null, 2))

      const signatureRequest = await signatureApi.create(payload) as SignatureRequest
      router.push(`/signatures/${signatureRequest.id}`)
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.status === 403) {
        router.push('/subscription?reason=required')
        return
      }
      setError(apiError.message || 'Error al crear la solicitud de firma')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loadingDoc || loadingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">Error al cargar el documento</p>
            <Link href="/dashboard">
              <Button variant="primary">Volver al dashboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  if (!hasAccessToCreate) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href={`/documents/${id}`}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            ← Volver al documento
          </Link>
        </div>

        <Card>
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900">Suscripción requerida</h1>
            <p className="text-gray-700 mt-2">
              Para crear solicitudes de firma necesitas una suscripción activa cuando superas los 3 documentos gratis.
            </p>

            <div className="mt-6 grid lg:grid-cols-4 gap-6">
              <Button variant="primary" onClick={() => router.push('/subscription?reason=required')}>
                Ver planes
              </Button>
              <Button variant="secondary" onClick={() => router.push('/dashboard')}>
                Volver
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href={`/documents/${id}`}
          className="text-blue-600 hover:text-blue-700 text-sm"
        >
          ← Volver al documento
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Crear Solicitud de Firma
        </h1>
        <p className="text-gray-600 mt-2">Documento: {document.title}</p>
      </div>

      {/* Indicador de pasos */}
      <div className="mb-8">
        <div className="flex items-center">
          <div className={`flex items-center ${currentStep === 'signers' ? 'text-blue-600' : 'text-green-600'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold 
                            ${currentStep === 'signers' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}>
              {currentStep === 'positions' ? '✓' : '1'}
            </div>
            <span className="ml-3 font-medium">Agregar Firmantes</span>
          </div>
          
          <div className="flex-1 h-1 bg-gray-300 mx-4"></div>
          
          <div className={`flex items-center ${currentStep === 'positions' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold 
                            ${currentStep === 'positions' ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
              2
            </div>
            <span className="ml-3 font-medium">Posicionar Campos de Firma (Opcional)</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* PASO 1: Agregar Firmantes */}
      {currentStep === 'signers' && (
        <Card title="Información de la Solicitud">
          <form onSubmit={(e) => { e.preventDefault(); handleContinueToPositions(); }} className="space-y-6">
            <Input
              label="Título de la solicitud"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Firmantes
              </label>
              <div className="space-y-4">
                {signers.map((signer, index) => (
                  <div key={index} className="flex gap-4 items-start p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1 space-y-3">
                      <Input
                        label={`Nombre completo del firmante ${index + 1}`}
                        value={signer.fullName}
                        onChange={(e) => updateSigner(index, 'fullName', e.target.value)}
                        required
                      />
                      <Input
                        label="Email"
                        type="email"
                        value={signer.email}
                        onChange={(e) => updateSigner(index, 'email', e.target.value)}
                        required
                      />
                    </div>
                    {signers.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => removeSigner(index)}
                        className="mt-8"
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={addSigner}
                className="mt-4"
              >
                + Agregar firmante
              </Button>
            </div>

            <Input
              label="Horas hasta expiración"
              type="number"
              value={expirationHours}
              onChange={(e) => setExpirationHours(parseInt(e.target.value))}
              min={1}
            />

            <div className="flex gap-4">
              <Button
                type="submit"
                variant="primary"
              >
                Continuar a Posicionamiento →
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setCurrentStep('positions')
                }}
              >
                Saltar posicionamiento (crear sin posiciones)
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* PASO 2: Posicionar Campos de Firma */}
      {currentStep === 'positions' && (
        <div className="space-y-6">
          <Card title="🎯 Posiciona los Campos de Firma en el PDF">
            <div className="mb-4 space-y-3">
              <p className="text-sm text-gray-700">
                Arrastra sobre el PDF para crear un campo de firma para cada firmante. 
                Los campos de firma indican dónde aparecerá la firma de cada persona en el documento final.
              </p>
              
              {/* Botón de detección automática */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900">
                    ✨ Detección Automática (Beta)
                  </p>
                  <p className="text-xs text-blue-700">
                    Usa IA para sugerir posiciones de firma automáticamente
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    try {
                      setLoading(true)
                      const response = await fetch(
                        `${API_CONFIG.SIGNATURE_SERVICE}/api/signatures/detect-fields/${id}`,
                        { method: 'POST' }
                      )
                      const data = await response.json()
                      const suggestions = Array.isArray(data) ? data : []

                      // Aplicar sugerencias (una por firmante) - pendiente de implementar
                      suggestions.slice(0, signers.length).forEach(() => {})
                    } catch {
                      setError('No se pudieron detectar campos automáticamente')
                    } finally {
                      setLoading(false)
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? 'Detectando...' : '🤖 Detectar Automáticamente'}
                </Button>
              </div>
            </div>

            <SignatureFieldPlacer
              pdfUrl={documentApi.getViewUrl(document.id)}
              signers={signers.map((s, index) => ({
                id: index.toString(),
                name: s.fullName
              }))}
              onFieldsChange={handleFieldsChange}
              className="mt-4"
            />
          </Card>

          <div className="flex gap-4">
            <Button
              variant="ghost"
              onClick={() => setCurrentStep('signers')}
              disabled={loading}
            >
              ← Volver
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Creando...' : 'Crear Solicitud de Firma'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
