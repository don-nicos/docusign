'use client'

import { useEffect, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'

// Configurar worker de PDF.js
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
}

interface PDFViewerProps {
  fileUrl: string
  onLoadSuccess?: (numPages: number) => void
  className?: string
  initialPageNumber?: number
}

export function PDFViewer({ fileUrl, onLoadSuccess, className = '', initialPageNumber }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [error, setError] = useState<string>('')

  const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setPageNumber(initialPageNumber && initialPageNumber >= 1 && initialPageNumber <= numPages ? initialPageNumber : 1)
    setError('')
    onLoadSuccess?.(numPages)
  }

  // Si cambia la página inicial (p.ej. al cambiar de firmante), sincronizar
  useEffect(() => {
    if (numPages > 0 && initialPageNumber && initialPageNumber >= 1 && initialPageNumber <= numPages) {
      setPageNumber(initialPageNumber)
    }
  }, [initialPageNumber, numPages])

  const handleLoadError = (error: Error) => {
    console.error('Error al cargar PDF:', error)
    setError('No se pudo cargar el documento PDF')
  }

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1))
  }

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages))
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto bg-gray-100 rounded-lg p-4">
        <div className="flex justify-center">
          <Document
            file={fileUrl}
            onLoadSuccess={handleLoadSuccess}
            onLoadError={handleLoadError}
            loading={
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-lg"
              width={800}
            />
          </Document>
        </div>
      </div>

      {numPages > 0 && (
        <div className="flex items-center justify-between mt-4 px-4 py-3 bg-white rounded-lg shadow">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            ← Anterior
          </button>

          <span className="text-gray-700 font-medium">
            Página {pageNumber} de {numPages}
          </span>

          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}
