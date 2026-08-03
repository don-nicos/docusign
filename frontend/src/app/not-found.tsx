import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Página no encontrada</h1>
        <p className="text-gray-600 mt-2">La página que buscas no existe o fue movida.</p>
        <div className="mt-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            Ir al dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
