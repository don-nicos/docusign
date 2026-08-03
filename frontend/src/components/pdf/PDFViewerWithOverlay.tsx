'use client'

import { PDFViewer } from './PDFViewer'

interface SignatureFieldOverlay {
  x: number
  y: number
  width: number
  height: number
  page: number
  label?: string
}

interface PDFViewerWithOverlayProps {
  fileUrl: string
  signatureField?: SignatureFieldOverlay | null
  className?: string
}

export function PDFViewerWithOverlay({ 
  fileUrl, 
  signatureField,
  className = '' 
}: PDFViewerWithOverlayProps) {
  return (
    <div className="relative">
      <PDFViewer fileUrl={fileUrl} className={className} />
      
      {/* Overlay del campo de firma */}
      {signatureField && (
        <div
          className="absolute border-4 border-blue-500 bg-blue-200 bg-opacity-20 
                     flex items-center justify-center font-bold text-blue-900
                     animate-pulse pointer-events-none rounded-lg z-10"
          style={{
            left: `${signatureField.x}px`,
            top: `${signatureField.y}px`,
            width: `${signatureField.width}px`,
            height: `${signatureField.height}px`,
          }}
        >
          <div className="text-center bg-white bg-opacity-90 px-3 py-2 rounded-md shadow-lg">
            <div className="text-lg mb-1">✍️</div>
            <div className="text-sm font-bold">Firma aquí</div>
            {signatureField.label && (
              <div className="text-xs text-gray-600 mt-1">{signatureField.label}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
