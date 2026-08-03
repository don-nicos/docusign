'use client'

import { useRef, useState } from 'react'
import SignatureCanvasLib from 'react-signature-canvas'
import { Button } from '@/components/ui/Button'

interface SignatureCanvasProps {
  onSave: (signatureDataUrl: string) => void
  onCancel?: () => void
}

export function SignatureCanvas({ onSave, onCancel }: SignatureCanvasProps) {
  const sigPadRef = useRef<SignatureCanvasLib>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  const handleClear = () => {
    sigPadRef.current?.clear()
    setIsEmpty(true)
  }

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

  const handleSave = () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      const canvas = sigPadRef.current.getCanvas()
      const trimmedDataUrl = trimCanvas(canvas)
      onSave(trimmedDataUrl)
    }
  }

  const handleEnd = () => {
    setIsEmpty(sigPadRef.current?.isEmpty() ?? true)
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Dibuja tu firma
        </h3>
        <p className="text-sm text-gray-600">
          Usa el mouse o tu dedo para dibujar tu firma
        </p>
      </div>

      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
        <SignatureCanvasLib
          ref={sigPadRef}
          canvasProps={{
            width: 500,
            height: 200,
            className: 'signature-canvas cursor-crosshair',
          }}
          onEnd={handleEnd}
          backgroundColor="rgba(0,0,0,0)"
          penColor="black"
        />
      </div>

      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          onClick={handleClear}
          disabled={isEmpty}
        >
          🗑️ Limpiar
        </Button>

        <div className="flex space-x-3">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isEmpty}
          >
            ✓ Guardar Firma
          </Button>
        </div>
      </div>

      <style jsx global>{`
        .signature-canvas {
          touch-action: none;
        }
      `}</style>
    </div>
  )
}
