'use client'

import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { savedSignatureApi } from '@/lib/api'
import type { SavedSignature } from '@/types'

interface SignatureSavedProps {
  onSave: (signatureDataUrl: string) => void
  onCancel: () => void
}

export function SignatureSaved({ onSave, onCancel }: SignatureSavedProps) {
  const [signatures, setSignatures] = useState<SavedSignature[]>([])
  const [selectedSignature, setSelectedSignature] = useState<SavedSignature | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSignatures()
  }, [])

  const loadSignatures = async () => {
    try {
      setLoading(true)
      const data = await savedSignatureApi.list()
      setSignatures(data)
      
      // Auto-seleccionar la firma por defecto si existe
      const defaultSig = data.find(sig => sig.isDefault)
      if (defaultSig) {
        setSelectedSignature(defaultSig)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar firmas guardadas'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    if (!selectedSignature) {
      alert('Por favor selecciona una firma')
      return
    }
    onSave(selectedSignature.signatureData)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Cargando firmas guardadas...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    )
  }

  if (signatures.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
        <p className="text-gray-600 mb-4">No tienes firmas guardadas</p>
        <p className="text-sm text-gray-500 mb-4">
          Puedes guardar firmas desde tu perfil para usarlas rápidamente
        </p>
        <Button variant="secondary" onClick={onCancel}>
          Volver
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Selecciona una firma guardada
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {signatures.map((sig) => (
            <div
              key={sig.id}
              onClick={() => setSelectedSignature(sig)}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedSignature?.id === sig.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <div className="aspect-video bg-white rounded border border-gray-100 flex items-center justify-center mb-2 overflow-hidden">
                <img
                  src={sig.signatureData}
                  alt={sig.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 truncate">{sig.name}</p>
                {sig.isDefault && (
                  <span className="text-xs text-blue-600 font-medium">Por defecto</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedSignature && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Firma seleccionada:</strong> {selectedSignature.name}
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!selectedSignature}>
          Usar esta firma
        </Button>
      </div>
    </div>
  )
}
