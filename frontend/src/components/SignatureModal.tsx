'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from './ui/Button'

interface SignatureModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, signatureData: string, isDefault: boolean) => Promise<void>
  userFullName?: string
}

type SignatureType = 'draw' | 'type'

const SIGNATURE_FONTS = [
  { name: 'Elegante', value: 'Dancing Script, cursive' },
  { name: 'Clásica', value: 'Great Vibes, cursive' },
  { name: 'Moderna', value: 'Pacifico, cursive' },
]

export function SignatureModal({ isOpen, onClose, onSave, userFullName = '' }: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [signatureType, setSignatureType] = useState<SignatureType>('draw')
  const [isDrawing, setIsDrawing] = useState(false)
  const [name, setName] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Para firma escrita
  const [typedText, setTypedText] = useState(userFullName)
  const [selectedFont, setSelectedFont] = useState(0)

  useEffect(() => {
    if (isOpen) {
      setName('')
      setIsDefault(false)
      setTypedText(userFullName)
      clearCanvas()
    }
  }, [isOpen, userFullName])

  // Renderizar firma escrita en canvas
  useEffect(() => {
    if (signatureType === 'type' && typedText) {
      renderTypedSignature()
    }
  }, [typedText, selectedFont, signatureType])

  const renderTypedSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Configurar texto
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#000'

    // Ajustar tamaño de fuente dinámicamente
    let fontSize = 60
    ctx.font = `${fontSize}px ${SIGNATURE_FONTS[selectedFont].value}`
    let textWidth = ctx.measureText(typedText).width

    const maxWidth = canvas.width - 40
    while (textWidth > maxWidth && fontSize > 20) {
      fontSize -= 2
      ctx.font = `${fontSize}px ${SIGNATURE_FONTS[selectedFont].value}`
      textWidth = ctx.measureText(typedText).width
    }

    ctx.fillText(typedText, canvas.width / 2, canvas.height / 2)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.lineTo(x, y)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Por favor ingresa un nombre para la firma')
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    // Verificar que hay algo en el canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const hasContent = imageData.data.some(pixel => pixel !== 0)
    
    if (!hasContent) {
      alert(signatureType === 'draw' ? 'Por favor dibuja tu firma' : 'Por favor ingresa tu nombre')
      return
    }

    setSaving(true)
    try {
      const signatureData = canvas.toDataURL('image/png')
      await onSave(name, signatureData, isDefault)
      onClose()
    } catch (err) {
      console.error('Error al guardar firma:', err)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Agregar Firma</h3>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Nombre de la firma */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Nombre de la firma
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Firma Personal"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => {
                setSignatureType('draw')
                clearCanvas()
              }}
              className={`px-4 py-2 font-medium transition-colors ${
                signatureType === 'draw'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ✍️ Dibujar
            </button>
            <button
              onClick={() => {
                setSignatureType('type')
                renderTypedSignature()
              }}
              className={`px-4 py-2 font-medium transition-colors ${
                signatureType === 'type'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📝 Escribir
            </button>
          </div>

          {/* Firma dibujada */}
          {signatureType === 'draw' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Dibuja tu firma
              </label>
              <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  className="w-full cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <div className="flex justify-end mt-2">
                <button
                  onClick={clearCanvas}
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                >
                  Limpiar
                </button>
              </div>
            </div>
          )}

          {/* Firma escrita */}
          {signatureType === 'type' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Escribe tu nombre
              </label>
              <input
                type="text"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder="Tu nombre completo"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-3 text-gray-900 placeholder-gray-400 font-medium"
              />

              <label className="block text-sm font-medium text-gray-900 mb-2">
                Estilo de firma
              </label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {SIGNATURE_FONTS.map((font, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedFont(index)}
                    className={`p-3 border-2 rounded-lg transition-all ${
                      selectedFont === index
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-300 hover:border-gray-400 bg-white'
                    }`}
                  >
                    <span style={{ fontFamily: font.value }} className="text-2xl block text-gray-900">
                      Abc
                    </span>
                    <span className="text-xs text-gray-900 font-medium mt-1 block">{font.name}</span>
                  </button>
                ))}
              </div>

              <label className="block text-sm font-medium text-gray-900 mb-2">
                Vista previa
              </label>
              <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Checkbox por defecto */}
          <div className="flex items-center bg-gray-50 p-3 rounded-lg">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <label htmlFor="isDefault" className="ml-3 text-sm font-medium text-gray-900">
              Establecer como firma por defecto
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Firma'}
          </Button>
        </div>
      </div>
    </div>
  )
}
