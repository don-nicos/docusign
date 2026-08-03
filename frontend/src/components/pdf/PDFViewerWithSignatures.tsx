'use client'

// Import polyfills FIRST before any other imports
import '@/lib/polyfills'
// Import PDF worker configuration BEFORE react-pdf components
import '@/lib/pdfWorker'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { PDF_VIEWER_WIDTH } from '@/lib/pdfConstants'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

interface SignaturePosition {
  signerId: string
  signerName: string
  signerEmail: string
  x: number
  y: number
  width: number
  height: number
  page: number
  status: 'PENDING' | 'SIGNED' | 'PREVIEW'
  signatureImageUrl?: string
}

interface PDFViewerWithSignaturesProps {
  fileUrl: string
  signatures: SignaturePosition[]
  currentSignerId?: string
  className?: string
  showInstructions?: boolean
  pdfViewerWidth?: number // Ancho usado al crear las posiciones
}

// Configurar worker como fallback (por si la importación no funcionó)
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
}

export function PDFViewerWithSignatures({
  fileUrl,
  signatures,
  currentSignerId,
  className = '',
  showInstructions = true,
  pdfViewerWidth
}: PDFViewerWithSignaturesProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [isDocumentLoaded, setIsDocumentLoaded] = useState<boolean>(false)
  const [isWorkerReady, setIsWorkerReady] = useState<boolean>(false)
  
  // Usar el ancho guardado o el ancho estándar
  const viewerWidth = pdfViewerWidth || PDF_VIEWER_WIDTH

  // Asegurar que el worker esté configurado antes de renderizar
  useEffect(() => {
    const configureWorker = () => {
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
        console.log('⚠️ Worker configurado en useEffect (fallback)')
      }
      // Esperar un tick para asegurar que el worker esté realmente disponible
      setTimeout(() => {
        setIsWorkerReady(true)
        console.log('✅ Worker ready, can render PDF')
      }, 100)
    }
    
    configureWorker()
  }, [])

  // Reset state when fileUrl changes
  useEffect(() => {
    setIsDocumentLoaded(false)
    setNumPages(0)
  }, [fileUrl])

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    console.log('Document loaded successfully with', numPages, 'pages')
    setNumPages(numPages)
    setIsDocumentLoaded(true)
  }, [])

  // Obtener color según el estado y si es el firmante actual
  const getSignatureColor = (signature: SignaturePosition) => {
    const isCurrent = signature.signerId === currentSignerId
    
    if (signature.status === 'SIGNED') {
      return {
        bg: 'rgba(34, 197, 94, 0.95)', // Verde más sólido
        border: 'rgb(34, 197, 94)',
        text: 'rgb(255, 255, 255)', // Texto blanco para mejor contraste
        borderWidth: '3px'
      }
    }
    
    if (signature.status === 'PREVIEW') {
      return {
        bg: 'rgba(168, 85, 247, 0.95)', // Púrpura para vista previa
        border: 'rgb(147, 51, 234)',
        text: 'rgb(255, 255, 255)',
        pulse: true,
        borderWidth: '4px'
      }
    }
    
    if (isCurrent) {
      return {
        bg: 'rgba(59, 130, 246, 0.95)', // Azul más sólido
        border: 'rgb(37, 99, 235)',
        text: 'rgb(255, 255, 255)', // Texto blanco para mejor contraste
        pulse: true, // Añadir animación pulse
        borderWidth: '4px'
      }
    }
    
    return {
      bg: 'rgba(75, 85, 99, 0.9)', // Gris más oscuro y sólido
      border: 'rgb(55, 65, 81)',
      text: 'rgb(255, 255, 255)', // Texto blanco para mejor contraste
      borderWidth: '2px'
    }
  }

  const currentSignature = signatures.find(s => s.signerId === currentSignerId)

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Instrucciones y navegación */}
      {showInstructions && (
        <div className="mb-4 space-y-4">
          {/* Mostrar instrucciones específicas para el firmante actual */}
          {currentSignature && currentSignature.status === 'PENDING' && (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-bold text-blue-900">
                    Tu zona de firma está marcada en azul
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Busca el recuadro azul parpadeante en la <strong>página {currentSignature.page}</strong>.
                    Ahí es donde aparecerá tu firma en el documento.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Leyenda de colores */}
          <div className="flex flex-wrap gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
              <span className="text-sm text-gray-700">Firmado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-200 border-2 border-blue-500 rounded animate-pulse"></div>
              <span className="text-sm text-gray-700">Tu firma (pendiente)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border-2 border-gray-400 rounded"></div>
              <span className="text-sm text-gray-700">Otros firmantes (pendiente)</span>
            </div>
          </div>

          {/* Indicador de páginas totales */}
          {numPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-2 bg-white border rounded-lg">
              <span className="text-sm font-medium text-gray-700">
                📄 {numPages} {numPages === 1 ? 'página' : 'páginas'} • Scroll para navegar
              </span>
            </div>
          )}
        </div>
      )}

      {/* Visor PDF con posiciones de firma - Scroll vertical */}
      <div className="relative border-2 border-gray-300 rounded-lg overflow-auto bg-gray-100" style={{ maxHeight: '800px' }}>
        {!isWorkerReady ? (
          <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-600">Inicializando visor PDF...</p>
            </div>
          </div>
        ) : (
          <div className="relative flex flex-col items-center">
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center h-96">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              }
              error={
                <div className="flex items-center justify-center h-96">
                  <p className="text-red-600">Error al cargar el PDF</p>
                </div>
              }
            >
            {isDocumentLoaded && numPages > 0 ? (
              // Renderizar TODAS las páginas en scroll vertical
              Array.from(new Array(numPages), (el, index) => (
                <div key={`page-container-${index + 1}`} className="relative mb-4">
                  {isDocumentLoaded && (
                    <Page
                      pageNumber={index + 1}
                      width={viewerWidth}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      loading={
                        <div className="flex items-center justify-center h-96">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                      }
                      error={
                        <div className="flex items-center justify-center h-96">
                          <p className="text-red-600">Error al cargar la página {index + 1}</p>
                        </div>
                      }
                    />
                  )}
                  
                  {/* Overlay de posiciones de firma para esta página */}
                  {signatures
                    .filter(sig => sig.page === index + 1)
                    .map((signature, sigIndex) => {
                      const colors = getSignatureColor(signature)
                      const isCurrent = signature.signerId === currentSignerId
                      
                      // Si está firmado, NO mostrar overlay - la firma ya está en el PDF
                      if (signature.status === 'SIGNED') {
                        return null
                      }
                      
                      // Para preview y pendientes, mostrar con overlay
                      return (
                        <div
                          key={`${signature.signerId}-${sigIndex}`}
                          className={`absolute flex flex-col items-center justify-center rounded-lg shadow-lg transition-all ${
                            colors.pulse ? 'animate-pulse' : ''
                          }`}
                          style={{
                            left: `${signature.x}px`,
                            top: `${signature.y}px`,
                            width: `${signature.width}px`,
                            height: `${signature.height}px`,
                            backgroundColor: colors.bg,
                            borderColor: colors.border,
                            borderStyle: 'dashed',
                            borderWidth: colors.borderWidth,
                            zIndex: isCurrent ? 20 : 10,
                          }}
                        >
                          {/* Si está en preview y tiene imagen de firma, mostrarla */}
                          {signature.status === 'PREVIEW' && signature.signatureImageUrl ? (
                            <div className="relative w-full h-full">
                              <img
                                src={signature.signatureImageUrl}
                                alt={`Firma de ${signature.signerName}`}
                                className="w-full h-full object-fill rounded-lg"
                              />
                              <div className="absolute top-1 right-1 bg-purple-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                                Vista Previa
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Icono y texto para firmas pendientes */}
                              <div 
                                className="text-center px-3 py-2 w-full h-full flex flex-col justify-center" 
                                style={{ color: colors.text }}
                              >
                                <div className="text-3xl mb-2">
                                  ✍️
                                </div>
                                <div className="font-bold text-sm mb-1" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}>
                                  {signature.signerName}
                                </div>
                                <div className="text-xs font-medium">
                                  {isCurrent ? 'FIRMA AQUÍ' : 'PENDIENTE'}
                                </div>
                                {isCurrent && signature.status === 'PENDING' && (
                                  <div className="text-xs mt-1 font-semibold">
                                    ↓ Tu zona de firma ↓
                                  </div>
                                )}
                              </div>
                            </>
                          )}

                          {/* Badge de estado en la esquina */}
                          {isCurrent && signature.status === 'PENDING' && (
                            <div className="absolute -top-3 -right-3 bg-red-600 text-white text-sm px-3 py-1 rounded-full font-bold shadow-lg animate-bounce">
                              TÚ
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              ))
            ) : null}
          </Document>
        </div>
        )}
      </div>

      {/* Resumen de firmantes */}
      <div className="mt-4 p-4 bg-white border rounded-lg">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Estado de Firmas:</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {signatures
            .reduce((unique: SignaturePosition[], sig) => {
              const exists = unique.find(u => u.signerId === sig.signerId)
              if (!exists) unique.push(sig)
              return unique
            }, [])
            .map(signature => {
              const colors = getSignatureColor(signature)
              const isCurrent = signature.signerId === currentSignerId
              
              return (
                <div
                  key={signature.signerId}
                  className={`flex items-center gap-2 p-2 rounded-lg border ${
                    isCurrent ? 'border-2' : ''
                  }`}
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                  }}
                >
                  <div className="text-xl">
                    {signature.status === 'SIGNED' ? '✅' : '⏳'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {signature.signerName} {isCurrent && '(Tú)'}
                    </div>
                    <div className="text-xs text-gray-600 truncate">
                      {signature.signerEmail}
                    </div>
                    <div className="text-xs" style={{ color: colors.text }}>
                      Página {signature.page} • {signature.status === 'SIGNED' ? 'Firmado' : 'Pendiente'}
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
