'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface SignatureTypedProps {
  onSave: (signatureDataUrl: string) => void
  onCancel?: () => void
  defaultName?: string
}

const SIGNATURE_FONTS = [
  { name: 'Brush Script', value: 'cursive' },
  { name: 'Dancing Script', value: '"Dancing Script", cursive' },
  { name: 'Great Vibes', value: '"Great Vibes", cursive' },
  { name: 'Pacifico', value: '"Pacifico", cursive' },
]

export function SignatureTyped({ onSave, onCancel, defaultName = '' }: SignatureTypedProps) {
  const [fullName, setFullName] = useState(defaultName)
  const [selectedFont, setSelectedFont] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // Cargar fuentes de Google Fonts
    const link = document.createElement('link')
    link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Great+Vibes&family=Pacifico&display=swap'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }, [])

  const trimCanvas = (canvas: HTMLCanvasElement): string => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return canvas.toDataURL('image/png')

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data
    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const alpha = pixels[(y * canvas.width + x) * 4 + 3]
        if (alpha > 0) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }

    const padding = 10
    minX = Math.max(0, minX - padding)
    minY = Math.max(0, minY - padding)
    maxX = Math.min(canvas.width, maxX + padding)
    maxY = Math.min(canvas.height, maxY + padding)

    const trimmedWidth = maxX - minX
    const trimmedHeight = maxY - minY

    const trimmedCanvas = document.createElement('canvas')
    trimmedCanvas.width = trimmedWidth
    trimmedCanvas.height = trimmedHeight
    const trimmedCtx = trimmedCanvas.getContext('2d')
    
    if (trimmedCtx) {
      trimmedCtx.drawImage(
        canvas,
        minX, minY, trimmedWidth, trimmedHeight,
        0, 0, trimmedWidth, trimmedHeight
      )
    }

    return trimmedCanvas.toDataURL('image/png')
  }

  const generateSignatureImage = () => {
    const canvas = canvasRef.current
    if (!canvas || !fullName.trim()) return null

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Configurar canvas
    canvas.width = 500
    canvas.height = 200

    // Limpiar canvas (transparente)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Configurar texto
    ctx.fillStyle = 'black'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Ajustar tamaño de fuente dinámicamente para que quepa
    let fontSize = 60
    ctx.font = `${fontSize}px ${SIGNATURE_FONTS[selectedFont].value}`
    let textWidth = ctx.measureText(fullName).width
    
    // Reducir tamaño si el texto es muy ancho (dejar margen de 40px)
    const maxWidth = canvas.width - 40
    while (textWidth > maxWidth && fontSize > 20) {
      fontSize -= 2
      ctx.font = `${fontSize}px ${SIGNATURE_FONTS[selectedFont].value}`
      textWidth = ctx.measureText(fullName).width
    }

    // Dibujar texto centrado
    ctx.fillText(fullName, canvas.width / 2, canvas.height / 2)

    // Recortar espacio en blanco y retornar
    return trimCanvas(canvas)
  }

  const handleSave = () => {
    const dataUrl = generateSignatureImage()
    if (dataUrl) {
      onSave(dataUrl)
    }
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Firma tipográfica
        </h3>
        <p className="text-sm text-gray-600">
          Escribe tu nombre completo y elige un estilo
        </p>
      </div>

      <Input
        label="Nombre completo"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Ej: Juan Pérez González"
        autoFocus
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Selecciona un estilo de firma:
        </label>
        <div className="grid grid-cols-2 gap-3">
          {SIGNATURE_FONTS.map((font, index) => (
            <button
              key={index}
              onClick={() => setSelectedFont(index)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedFont === index
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div
                style={{
                  fontFamily: font.value,
                  fontSize: '32px',
                  color: 'black',
                }}
              >
                {fullName || 'Tu nombre'}
              </div>
              <div className="text-xs text-gray-500 mt-2">{font.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Vista previa */}
      {fullName && (
        <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
          <p className="text-xs text-gray-500 mb-2">Vista previa:</p>
          <div className="flex justify-center items-center h-32 bg-gray-50 rounded">
            <div
              style={{
                fontFamily: SIGNATURE_FONTS[selectedFont].value,
                fontSize: '48px',
                color: 'black',
              }}
            >
              {fullName}
            </div>
          </div>
        </div>
      )}

      {/* Canvas oculto para generar imagen */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div className="flex justify-end space-x-3 pt-4">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!fullName.trim()}
        >
          ✓ Usar esta Firma
        </Button>
      </div>
    </div>
  )
}
