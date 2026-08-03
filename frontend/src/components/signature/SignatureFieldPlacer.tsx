'use client'

import '@/lib/polyfills'
import '@/lib/pdfWorker'

import { useState, useRef, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Configurar worker de PDF.js
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
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

interface SignatureFieldPlacerProps {
  pdfUrl: string
  signers: Array<{ id: string; name: string }>
  onFieldsChange: (fields: SignatureField[]) => void
  className?: string
}

export function SignatureFieldPlacer({ 
  pdfUrl, 
  signers, 
  onFieldsChange,
  className = '' 
}: SignatureFieldPlacerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [fields, setFields] = useState<SignatureField[]>([])
  const [pdfLoadError, setPdfLoadError] = useState<string>('')
  const [selectedSigner, setSelectedSigner] = useState<string>(signers[0]?.id || '')
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [pageScale, setPageScale] = useState(1)
  const [resizingField, setResizingField] = useState<number | null>(null)
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [movingField, setMovingField] = useState<number | null>(null)
  const [moveStart, setMoveStart] = useState<{ x: number; y: number; fieldX: number; fieldY: number } | null>(null)
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null)
  const [pageOffset, setPageOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const pdfContainerRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    onFieldsChange(fields)
  }, [fields])

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setPdfLoadError('')
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedSigner) {
      alert('Selecciona un firmante primero')
      return
    }

    const container = pdfContainerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left - pageOffset.x
    const y = e.clientY - rect.top - pageOffset.y

    setIsDragging(true)
    setDragStart({ x, y })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStart) return

    // Visual feedback mientras arrastra (opcional)
    const container = pdfContainerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const currentX = e.clientX - rect.left
    const currentY = e.clientY - rect.top

    // Aquí podrías mostrar un rectángulo de preview
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStart || !selectedSigner) return

    const container = pdfContainerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const endX = e.clientX - rect.left - pageOffset.x
    const endY = e.clientY - rect.top - pageOffset.y

    // Tamaño por defecto para uniformidad
    const DEFAULT_WIDTH = 200
    const DEFAULT_HEIGHT = 80
    let x = Math.min(dragStart.x, endX)
    let y = Math.min(dragStart.y, endY)
    const width = DEFAULT_WIDTH
    const height = DEFAULT_HEIGHT

    // Validar que la firma no salga de los límites del PDF
    if (pageDimensions) {
      // Asegurar que x + width no exceda el ancho de la página
      if (x + width > pageDimensions.width) {
        x = pageDimensions.width - width
      }
      // Asegurar que x sea al menos 0
      if (x < 0) x = 0

      // Asegurar que y + height no exceda el alto de la página
      if (y + height > pageDimensions.height) {
        y = pageDimensions.height - height
      }
      // Asegurar que y sea al menos 0
      if (y < 0) y = 0
    }

    const signer = signers.find(s => s.id === selectedSigner)

    // Agregar campo
    const newField: SignatureField = {
      signerId: selectedSigner,
      signerName: signer?.name || 'Firmante',
      x,
      y,
      page: currentPage,
      width,
      height,
    }

    setFields([...fields, newField])
    setIsDragging(false)
    setDragStart(null)

    // Auto-seleccionar siguiente firmante si hay más
    const currentIndex = signers.findIndex(s => s.id === selectedSigner)
    if (currentIndex < signers.length - 1) {
      setSelectedSigner(signers[currentIndex + 1].id)
    }
  }

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
  }

  const handleResizeStart = (e: React.MouseEvent, fieldIndex: number) => {
    e.stopPropagation()
    e.preventDefault()
    
    const field = fields[fieldIndex]
    const container = pdfContainerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setResizingField(fieldIndex)
    setResizeStart({
      x,
      y,
      width: field.width,
      height: field.height
    })
  }

  const handleResizeMove = (e: React.MouseEvent) => {
    if (resizingField === null || !resizeStart) return

    const container = pdfContainerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const currentX = e.clientX - rect.left - pageOffset.x
    const currentY = e.clientY - rect.top - pageOffset.y

    const deltaX = currentX - resizeStart.x
    const deltaY = currentY - resizeStart.y

    let newWidth = Math.max(100, resizeStart.width + deltaX)
    let newHeight = Math.max(50, resizeStart.height + deltaY)

    const field = fields[resizingField]

    // Validar que el nuevo tamaño no haga que la firma salga de los límites
    if (pageDimensions) {
      // Limitar ancho para que no exceda el borde derecho
      if (field.x + newWidth > pageDimensions.width) {
        newWidth = pageDimensions.width - field.x
      }
      // Limitar alto para que no exceda el borde inferior
      if (field.y + newHeight > pageDimensions.height) {
        newHeight = pageDimensions.height - field.y
      }
    }

    const updatedFields = [...fields]
    updatedFields[resizingField] = {
      ...updatedFields[resizingField],
      width: newWidth,
      height: newHeight
    }

    setFields(updatedFields)
  }

  const handleResizeEnd = () => {
    setResizingField(null)
    setResizeStart(null)
  }

  const handleMoveStart = (e: React.MouseEvent, fieldIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    
    const container = pdfContainerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left - pageOffset.x
    const y = e.clientY - rect.top - pageOffset.y

    setMovingField(fieldIndex)
    setMoveStart({
      x,
      y,
      fieldX: fields[fieldIndex].x,
      fieldY: fields[fieldIndex].y
    })
  }

  const handleMoveMove = (e: React.MouseEvent) => {
    if (movingField === null || !moveStart || !pageDimensions) return

    const container = pdfContainerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const mouseX = e.clientX - rect.left - pageOffset.x
    const mouseY = e.clientY - rect.top - pageOffset.y

    const deltaX = mouseX - moveStart.x
    const deltaY = mouseY - moveStart.y

    // Calcular nueva posición con límites estrictos
    let newX = moveStart.fieldX + deltaX
    let newY = moveStart.fieldY + deltaY

    // Aplicar límites: no puede salir del área del PDF
    newX = Math.max(0, Math.min(newX, pageDimensions.width - fields[movingField].width))
    newY = Math.max(0, Math.min(newY, pageDimensions.height - fields[movingField].height))

    const updatedFields = [...fields]
    updatedFields[movingField] = {
      ...updatedFields[movingField],
      x: newX,
      y: newY
    }

    setFields(updatedFields)
  }

  const handleMoveEnd = () => {
    setMovingField(null)
    setMoveStart(null)
  }

  const getColorForSigner = (signerId: string) => {
    const index = signers.findIndex(s => s.id === signerId)
    const colors = [
      'rgba(59, 130, 246, 0.3)', // blue
      'rgba(16, 185, 129, 0.3)', // green
      'rgba(245, 158, 11, 0.3)', // yellow
      'rgba(239, 68, 68, 0.3)',  // red
      'rgba(139, 92, 246, 0.3)', // purple
    ]
    return colors[index % colors.length]
  }

  const getBorderColorForSigner = (signerId: string) => {
    const index = signers.findIndex(s => s.id === signerId)
    const colors = [
      'rgb(59, 130, 246)',  // blue
      'rgb(16, 185, 129)',  // green
      'rgb(245, 158, 11)',  // yellow
      'rgb(239, 68, 68)',   // red
      'rgb(139, 92, 246)',  // purple
    ]
    return colors[index % colors.length]
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Controles superiores */}
      <div className="mb-4 space-y-4">
        {/* Selector de firmante */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecciona firmante para posicionar campo:
          </label>
          <div className="flex flex-wrap gap-2">
            {signers.map((signer, index) => {
              const hasField = fields.some(f => f.signerId === signer.id)
              return (
                <button
                  key={signer.id}
                  onClick={() => setSelectedSigner(signer.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedSigner === signer.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={{
                    borderLeft: selectedSigner === signer.id 
                      ? `4px solid ${getBorderColorForSigner(signer.id)}` 
                      : undefined
                  }}
                >
                  {signer.name} {hasField && '✓'}
                </button>
              )
            })}
          </div>
        </div>

        {/* Instrucciones */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>📝 Instrucciones:</strong> Selecciona un firmante arriba, luego haz clic y arrastra 
            sobre el PDF para crear un campo de firma en la posición deseada.
          </p>
        </div>

        {/* Navegación de páginas */}
        {numPages > 1 && (
          <div className="flex items-center justify-center gap-4 p-4 bg-white border-2 border-blue-200 rounded-lg">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              ← Anterior
            </button>
            <div className="px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg">
              <span className="text-base font-bold text-blue-900">
                Página {currentPage} de {numPages}
              </span>
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
              disabled={currentPage === numPages}
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>

      {/* Visor PDF con campos */}
      <div 
        ref={containerRef}
        className="relative border-2 border-gray-300 rounded-lg overflow-auto bg-gray-100"
        style={{ maxHeight: '600px', width: '100%' }}
      >
        {pdfLoadError && (
          <div className="p-4">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {pdfLoadError}
            </div>
          </div>
        )}

        <div
          ref={pdfContainerRef}
          className="relative cursor-crosshair flex justify-center"
          onMouseDown={handleMouseDown}
          onMouseMove={(e) => {
            handleMouseMove(e)
            handleResizeMove(e)
            handleMoveMove(e)
          }}
          onMouseUp={(e) => {
            handleMouseUp(e)
            handleResizeEnd()
            handleMoveEnd()
          }}
          style={{ width: '100%' }}
        >
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={() => {
              setPdfLoadError('No se pudo cargar el documento. Revisa que el documento exista y que el servicio de documentos esté disponible.')
            }}
            className="flex justify-center"
            loading={
              <div className="flex items-center justify-center h-64 w-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            }
            error={
              <div className="flex items-center justify-center h-64 w-full">
                <p className="text-red-600">Error al cargar el PDF</p>
              </div>
            }
          >
            <Page 
              pageNumber={currentPage}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              width={Math.min(800, window.innerWidth - 100)}
              onLoadSuccess={(page) => {
                const scale = page.width / page.originalWidth
                setPageScale(scale)
                // Guardar dimensiones de la página renderizada para validación
                setPageDimensions({
                  width: page.width,
                  height: page.height
                })
                
                // Calcular offset de la página dentro del contenedor
                setTimeout(() => {
                  const pageElement = document.querySelector('.react-pdf__Page')
                  const container = pdfContainerRef.current
                  if (pageElement && container) {
                    const pageRect = pageElement.getBoundingClientRect()
                    const containerRect = container.getBoundingClientRect()
                    setPageOffset({
                      x: pageRect.left - containerRect.left,
                      y: pageRect.top - containerRect.top
                    })
                  }
                }, 100)
              }}
            />
          </Document>

          {/* Campos de firma superpuestos */}
          {fields
            .filter(field => field.page === currentPage)
            .map((field, index) => (
              <div
                key={index}
                className="absolute border-2 flex items-center justify-center text-xs font-semibold group cursor-move"
                style={{
                  left: `${field.x + pageOffset.x}px`,
                  top: `${field.y + pageOffset.y}px`,
                  width: `${field.width}px`,
                  height: `${field.height}px`,
                  backgroundColor: getColorForSigner(field.signerId),
                  borderColor: getBorderColorForSigner(field.signerId),
                  borderStyle: 'dashed',
                  pointerEvents: 'auto',
                }}
                onMouseDown={(e) => handleMoveStart(e, fields.indexOf(field))}
                title="Arrastra para mover, usa el círculo azul para redimensionar"
              >
                <span className="text-center px-2 pointer-events-none">
                  ✍️ {field.signerName}
                </span>
                
                {/* Botón eliminar */}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    removeField(fields.indexOf(field))
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  className="absolute -top-3 -right-3 w-7 h-7 bg-red-600 text-white rounded-full 
                             hover:bg-red-700 shadow-lg flex items-center justify-center font-bold text-lg
                             transition-all hover:scale-110 z-10"
                  title="Eliminar campo de firma"
                >
                  ×
                </button>

                {/* Handle de resize (esquina inferior derecha) */}
                <div
                  onMouseDown={(e) => handleResizeStart(e, fields.indexOf(field))}
                  className="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-600 border-2 border-white 
                             rounded-full cursor-nwse-resize hover:bg-blue-700 shadow-lg 
                             flex items-center justify-center transition-all hover:scale-110 z-10"
                  title="Redimensionar campo"
                >
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} 
                          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Lista de campos creados */}
      {fields.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Campos de firma creados ({fields.length}):
          </h4>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div 
                key={index}
                className="flex items-center justify-between bg-gray-50 p-2 rounded border"
                style={{ borderLeft: `4px solid ${getBorderColorForSigner(field.signerId)}` }}
              >
                <div className="text-sm">
                  <strong>{field.signerName}</strong> - Página {field.page}
                  <span className="text-gray-500 ml-2">
                    ({Math.round(field.width)}×{Math.round(field.height)}px)
                  </span>
                </div>
                <button
                  onClick={() => removeField(index)}
                  className="text-red-600 hover:text-red-800 font-bold"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advertencia si faltan campos */}
      {fields.length < signers.length && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            ⚠️ Faltan {signers.length - fields.length} campo(s) de firma. 
            Asegúrate de posicionar un campo para cada firmante.
          </p>
        </div>
      )}
    </div>
  )
}
