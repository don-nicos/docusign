"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { documentApi, organizationApi, paymentApi, type UserOrganization } from "@/lib/api"
import type { ApiError, Document } from "@/types"

export default function DocumentsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingAccess, setLoadingAccess] = useState(true)
  const [canUpload, setCanUpload] = useState(true)
  const [error, setError] = useState("")
  const [orgFilter, setOrgFilter] = useState<string>("")
  const [myOrganizations, setMyOrganizations] = useState<UserOrganization[]>([])
  const [loadingOrgs, setLoadingOrgs] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login")
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadUploadAccess()
    }
  }, [isAuthenticated])

  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        setLoadingOrgs(true)
        const orgs = await organizationApi.getMyOrganizations()
        setMyOrganizations(orgs)
      } catch (err) {
        console.error("Error loading organizations:", err)
      } finally {
        setLoadingOrgs(false)
      }
    }

    if (isAuthenticated) {
      loadOrganizations()
    }
  }, [isAuthenticated])

  useEffect(() => {
    loadDocuments()
  }, [orgFilter])

  const loadUploadAccess = async () => {
    try {
      setLoadingAccess(true)
      const [count, subscription] = await Promise.all([
        documentApi.count(),
        paymentApi.getMySubscription(),
      ])
      const active = subscription?.subscription?.status === "ACTIVE"
      setCanUpload(count.count < 3 || active)
    } catch (e) {
      setCanUpload(false)
    } finally {
      setLoadingAccess(false)
    }
  }

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const filterValue = orgFilter === "personal" ? undefined : (orgFilter || undefined)
      const data = await documentApi.list(filterValue)
      setDocuments(data as Document[])
    } catch (err) {
      setError("Error al cargar documentos")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Mis Documentos</h1>
        {!loadingAccess && canUpload ? (
          <Link href="/documents/upload">
            <Button variant="primary">Subir documento</Button>
          </Link>
        ) : !loadingAccess ? (
          <Button variant="primary" onClick={() => router.push('/subscription?reason=required')}>
            Subir documento
          </Button>
        ) : (
          <Button variant="primary" disabled>
            Subir documento
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filtrar por:
        </label>
        <select
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loadingOrgs}
        >
          <option value="">Todos los documentos</option>
          <option value="personal">Solo personales</option>
          {myOrganizations.map(org => (
            <option key={org.organizationId} value={org.organizationId}>
              {org.organizationName}
            </option>
          ))}
        </select>
      </div>

      <Card>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Cargando...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 text-gray-700">
            <p>No tienes documentos aún</p>
            <Link href="/documents/upload">
              <Button variant="primary" className="mt-4">Subir tu primer documento</Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {documents.map((doc) => (
              <div key={doc.id} className="py-4 flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{doc.title}</h3>
                  <p className="text-sm text-gray-700">{doc.originalFilename} • {(doc.fileSize / 1024).toFixed(1)} KB</p>
                  <p className="text-xs text-gray-600 mt-1">{new Date(doc.createdAt).toLocaleDateString('es-CL')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/documents/${doc.id}/view`}>
                    <Button variant="ghost" size="sm">Ver</Button>
                  </Link>
                  <a
                    href={`${documentApi.getDownloadUrl(doc.id)}?t=${Date.now()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 hover:text-blue-900 text-sm underline"
                  >
                    Descargar
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
