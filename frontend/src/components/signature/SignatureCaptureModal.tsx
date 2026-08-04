'use client'

import { useState } from 'react'
import { SignatureCanvas } from './SignatureCanvas'
import { SignatureTyped } from './SignatureTyped'
import { SignatureSaved } from './SignatureSaved'
import { savedSignatureApi } from '@/lib/api'
import { Button } from '../ui/Button'

interface SignatureCaptureModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (signatureDataUrl: string, method: 'draw' | 'type' | 'saved') => void
  signerName?: string
}

type SignatureMethod = 'draw' | 'type' | 'saved'

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return 'Ocurrió un error al guardar la firma'
}

export function SignatureCaptureModal({
  isOpen,
  onClose,
  onSave,
  signerName = '',
}: SignatureCaptureModalProps) {
  const [method, setMethod] = useState<SignatureMethod>('saved')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [pendingSignature, setPendingSignature] = useState<string>('')
  const [saveName, setSaveName] = useState('')
  const [saveAsDefault, setSaveAsDefault] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const handleSave = (signatureDataUrl: string) => {
    // Si es una firma guardada, usar directamente
    if (method === 'saved') {
      onSave(signatureDataUrl, method)
      return
    }
    
    // Si es nueva (draw o type), preguntar si quiere guardar
    setPendingSignature(signatureDataUrl)
    setShowSaveModal(true)
  }

  const handleConfirmWithoutSaving = () => {
    onSave(pendingSignature, method)
    setShowSaveModal(false)
    setPendingSignature('')
  }

  const handleSaveAndUse = async () => {
    if (!saveName.trim()) {
      alert('Por favor ingresa un nombre para la firma')
      return
    }

    setSaving(true)
    try {
      await savedSignatureApi.create({
        name: saveName,
        signatureData: pendingSignature,
        isDefault: saveAsDefault
      })
      
      onSave(pendingSignature, method)
      setShowSaveModal(false)
      setPendingSignature('')
      setSaveName('')
      setSaveAsDefault(false)
    } catch (err) {
      alert(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              Captura tu Firma
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
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
            </button>
          </div>

          {/* Tabs para seleccionar método */}
          <div className="flex space-x-4 mt-4">
            <button
              onClick={() => setMethod('saved')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                method === 'saved'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              💾 Usar guardada
            </button>
            <button
              onClick={() => setMethod('draw')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                method === 'draw'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ✍️ Dibujar
            </button>
            <button
              onClick={() => setMethod('type')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                method === 'type'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📝 Escribir
            </button>
          </div>
        </div>

        <div className="p-6">
          {method === 'saved' ? (
            <SignatureSaved onSave={handleSave} onCancel={onClose} />
          ) : method === 'draw' ? (
            <SignatureCanvas onSave={handleSave} onCancel={onClose} />
          ) : (
            <SignatureTyped
              onSave={handleSave}
              onCancel={onClose}
              defaultName={signerName}
            />
          )}
        </div>
      </div>

      {/* Modal de confirmación para guardar firma */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 rounded-t-xl">
              <h3 className="text-xl font-bold text-white">💾 Guardar Firma</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-gray-700">
                ¿Quieres guardar esta firma para usarla en futuros documentos?
              </p>

              <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center">
                <img 
                  src={pendingSignature} 
                  alt="Vista previa" 
                  className="max-h-24 object-contain"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Nombre de la firma
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Ej: Mi Firma Personal"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                />
              </div>

              <div className="flex items-center bg-blue-50 p-3 rounded-lg">
                <input
                  type="checkbox"
                  id="saveAsDefault"
                  checked={saveAsDefault}
                  onChange={(e) => setSaveAsDefault(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="saveAsDefault" className="ml-3 text-sm font-medium text-gray-900">
                  Establecer como firma por defecto
                </label>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex gap-3 rounded-b-xl">
              <Button 
                variant="secondary" 
                onClick={handleConfirmWithoutSaving}
                disabled={saving}
                className="flex-1"
              >
                No guardar
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSaveAndUse}
                disabled={saving}
                className="flex-1"
              >
                {saving ? 'Guardando...' : 'Guardar y usar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
