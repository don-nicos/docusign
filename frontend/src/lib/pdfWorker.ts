import { pdfjs } from 'react-pdf'

// Configurar worker de PDF.js INMEDIATAMENTE y de forma síncrona
// Este archivo debe importarse ANTES de cualquier componente que use react-pdf

// Configurar SIEMPRE, incluso si ya está configurado (para asegurar que esté correcto)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

if (typeof window !== 'undefined') {
  console.log('✅ PDF.js worker configurado:', pdfjs.GlobalWorkerOptions.workerSrc)
}

export {}
