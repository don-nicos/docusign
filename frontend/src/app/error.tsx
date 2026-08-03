'use client'

import Link from 'next/link'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Ocurrió un error</h1>
        <p className="text-gray-600 mt-2">Intenta nuevamente. Si el problema persiste, vuelve al dashboard.</p>

        <div className="mt-6 flex gap-3 justify-center">
          <button
            type="button"
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => reset()}
          >
            Reintentar
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200"
          >
            Ir al dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
