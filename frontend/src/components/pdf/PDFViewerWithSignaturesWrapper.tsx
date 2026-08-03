'use client'

import dynamic from 'next/dynamic'
import { ComponentProps } from 'react'

// Importar dinámicamente el componente PDF para evitar problemas de SSR
const PDFViewerWithSignatures = dynamic(
  () => import('./PDFViewerWithSignatures').then(mod => ({ default: mod.PDFViewerWithSignatures })),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }
)

type PDFViewerProps = ComponentProps<typeof PDFViewerWithSignatures>

export function PDFViewerWithSignaturesWrapper(props: PDFViewerProps) {
  return <PDFViewerWithSignatures {...props} />
}
