import { API_CONFIG } from './config'
import { createTracedHeaders, logWithTrace } from './tracing'
import type { ApiError } from '@/types'

class ApiClient {
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('accessToken')
  }

  private getUserId(): string | null {
    if (typeof window === 'undefined') return null
    const userStr = localStorage.getItem('user')
    if (!userStr) return null
    try {
      const user = JSON.parse(userStr)
      return user.id || null
    } catch {
      return null
    }
  }

  private getUserEmail(): string | null {
    if (typeof window === 'undefined') return null
    const userStr = localStorage.getItem('user')
    if (!userStr) return null
    try {
      const user = JSON.parse(userStr)
      return user.email || null
    } catch {
      return null
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = {
        message: response.statusText || 'Error desconocido',
        status: response.status,
      }
      
      try {
        const errorData = await response.json()
        error.message = errorData.message || errorData.error || error.message
      } catch {
        // Ignore JSON parse errors
      }

      throw error
    }

    if (response.status === 204) {
      return null as unknown as T
    }

    const text = await response.text()
    if (!text || !text.trim()) {
      return null as unknown as T
    }

    return JSON.parse(text) as T
  }

  async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAuthToken()
    const userId = this.getUserId()
    const userEmail = this.getUserEmail()
    
    // Crear headers con trace ID incluido
    const tracedHeaders = createTracedHeaders()
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...tracedHeaders, // Incluir trace ID
      ...(options.headers as Record<string, string>),
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    if (userId) {
      headers['X-User-Id'] = userId
    } else {
      console.warn('[API] No userId found in localStorage. User might not be authenticated.')
    }

    if (userEmail) {
      headers['X-User-Email'] = userEmail
    }

    // Log con trace ID
    logWithTrace('info', `API Request: ${options.method || 'GET'} ${url}`, { userId, hasToken: !!token })

    const response = await fetch(url, {
      ...options,
      headers,
    })

    return this.handleResponse<T>(response)
  }

  async get<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'GET' })
  }

  async post<T>(url: string, data?: unknown): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(url: string, data?: unknown): Promise<T> {
    return this.request<T>(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'DELETE' })
  }

  async uploadFile<T>(url: string, file: File, additionalData?: Record<string, string>): Promise<T> {
    const token = this.getAuthToken()
    const userId = this.getUserId()
    const formData = new FormData()
    formData.append('file', file)

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value)
      })
    }

    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    if (userId) {
      headers['X-User-Id'] = userId
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    })

    return this.handleResponse<T>(response)
  }
}

export const apiClient = new ApiClient()

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<import('@/types').AuthSession>(`${API_CONFIG.AUTH_SERVICE}/api/auth/login`, {
      email,
      password,
    }),

  register: (email: string, fullName: string, redirectPath?: string) =>
    apiClient.post(`${API_CONFIG.AUTH_SERVICE}/api/auth/register`, {
      email,
      fullName,
      redirectPath,
    }),

  requestMagicLink: (email: string, redirectPath?: string) =>
    apiClient.post(`${API_CONFIG.AUTH_SERVICE}/api/auth/magic-link/request`, {
      email,
      redirectPath,
    }),

  exchangeMagicLink: (token: string) =>
    apiClient.post(`${API_CONFIG.AUTH_SERVICE}/api/auth/magic-link/exchange`, {
      token,
    }),

  refreshToken: (refreshToken: string) =>
    apiClient.post(`${API_CONFIG.AUTH_SERVICE}/api/auth/refresh`, {
      refreshToken,
    }),

  getProfile: () =>
    apiClient.get(`${API_CONFIG.AUTH_SERVICE}/api/auth/me`),
}

// Document API
export const documentApi = {
  upload: (file: File, title?: string, organizationId?: string) =>
    apiClient.uploadFile(
      `${API_CONFIG.DOCUMENT_SERVICE}/api/documents`,
      file,
      {
        ...(title ? { title } : {}),
        ...(organizationId ? { organizationId } : {})
      }
    ),

  count: () =>
    apiClient.get<import('@/types').DocumentCountResponse>(`${API_CONFIG.DOCUMENT_SERVICE}/api/documents/count`),

  list: (organizationId?: string) =>
    apiClient.get(`${API_CONFIG.DOCUMENT_SERVICE}/api/documents${organizationId ? `?organizationId=${organizationId}` : ''}`),

  getById: (id: string) =>
    apiClient.get(`${API_CONFIG.DOCUMENT_SERVICE}/api/documents/${id}`),

  updateTitle: (id: string, title: string) =>
    apiClient.put(`${API_CONFIG.DOCUMENT_SERVICE}/api/documents/${id}/title`, {
      title,
    }),

  lock: (id: string) =>
    apiClient.post(`${API_CONFIG.DOCUMENT_SERVICE}/api/documents/${id}/lock`),

  delete: (id: string) =>
    apiClient.delete(`${API_CONFIG.DOCUMENT_SERVICE}/api/documents/${id}`),

  getDownloadUrl: (id: string) =>
    `${API_CONFIG.DOCUMENT_SERVICE}/api/documents/${id}/download`,

  getViewUrl: (id: string) =>
    `${API_CONFIG.DOCUMENT_SERVICE}/api/documents/${id}/view`,
}

// Signature API
export const signatureApi = {
  create: (payload: unknown) =>
    apiClient.post(`${API_CONFIG.SIGNATURE_SERVICE}/api/signatures`, payload),

  list: () =>
    apiClient.get(`${API_CONFIG.SIGNATURE_SERVICE}/api/signatures`),

  listMyRequests: () =>
    apiClient.get(`${API_CONFIG.SIGNATURE_SERVICE}/api/signatures/signer/my-requests`),

  getById: (id: string) =>
    apiClient.get(`${API_CONFIG.SIGNATURE_SERVICE}/api/signatures/${id}`),

  listByDocument: (documentId: string) =>
    apiClient.get(
      `${API_CONFIG.SIGNATURE_SERVICE}/api/signatures/document/${documentId}`
    ),

  requestOtp: (signerId: string) =>
    apiClient.post(
      `${API_CONFIG.SIGNATURE_SERVICE}/api/signatures/signer/${signerId}/request-otp`
    ),

  sign: (signerId: string, otp: string) =>
    apiClient.post(
      `${API_CONFIG.SIGNATURE_SERVICE}/api/signatures/signer/${signerId}/sign`,
      { otp }
    ),

  reject: (signerId: string, reason?: string) =>
    apiClient.post(`${API_CONFIG.SIGNATURE_SERVICE}/api/signatures/signer/${signerId}/reject`, {
      reason: reason || 'No especificado',
    }),

  uploadSignature: (signerId: string, signatureDataUrl: string, method?: string) =>
    apiClient.post(`${API_CONFIG.SIGNATURE_SERVICE}/api/signatures/signer/${signerId}/upload-signature`, {
      signatureDataUrl,
      method,
    }),

  getSignerInfo: (signerId: string, token?: string) => {
    const url = token 
      ? `${API_CONFIG.SIGNATURE_SERVICE}/api/signatures/signer/${signerId}/info?token=${token}`
      : `${API_CONFIG.SIGNATURE_SERVICE}/api/signatures/signer/${signerId}/info`
    return apiClient.get(url)
  },

  downloadSignedPdf: async (signatureRequestId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    const userJson = userStr ? JSON.parse(userStr) : null
    const userId = userJson ? userJson.id : null
    const userEmail = userJson
      ? (userJson.email || userJson.userEmail || userJson.username || userJson.user?.email || null)
      : null

    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    if (userId) headers['X-User-Id'] = userId
    if (userEmail) headers['X-User-Email'] = userEmail

    const response = await fetch(
      `${API_CONFIG.SIGNATURE_SERVICE}/api/signatures/${signatureRequestId}/download-signed`,
      { headers }
    )

    if (!response.ok) {
      throw new Error('Error al descargar el PDF')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `documento-firmado-${signatureRequestId}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  },

  downloadPdfVersion: async (signatureRequestId: string, versionNumber: number) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    const userJson = userStr ? JSON.parse(userStr) : null
    const userId = userJson ? userJson.id : null
    const userEmail = userJson
      ? (userJson.email || userJson.userEmail || userJson.username || userJson.user?.email || null)
      : null

    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    if (userId) headers['X-User-Id'] = userId
    if (userEmail) headers['X-User-Email'] = userEmail

    const response = await fetch(
      `${API_CONFIG.SIGNATURE_SERVICE}/api/signatures/${signatureRequestId}/versions/${versionNumber}/download`,
      { headers }
    )

    if (!response.ok) {
      throw new Error('Error al descargar la versión del PDF')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `documento-v${versionNumber}-${signatureRequestId}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  },
}

// User Profile API
export const userApi = {
  getProfile: () =>
    apiClient.get(`${API_CONFIG.AUTH_SERVICE}/api/users/me`),

  updateProfile: (data: {
    fullName?: string
    rut?: string
    firstName?: string
    lastName?: string
    secondLastName?: string
    phone?: string
  }) =>
    apiClient.put(`${API_CONFIG.AUTH_SERVICE}/api/users/profile`, data),

  getUserByEmail: (email: string) =>
    apiClient.get(`${API_CONFIG.AUTH_SERVICE}/api/users/by-email/${email}`),
}

// Saved Signatures API
export const savedSignatureApi = {
  list: () =>
    apiClient.get<import('@/types').SavedSignature[]>(`${API_CONFIG.AUTH_SERVICE}/api/signatures/saved`),

  getDefault: () =>
    apiClient.get<import('@/types').SavedSignature>(`${API_CONFIG.AUTH_SERVICE}/api/signatures/saved/default`),

  create: (data: { name: string; signatureData: string; isDefault?: boolean }) =>
    apiClient.post<import('@/types').SavedSignature>(`${API_CONFIG.AUTH_SERVICE}/api/signatures/saved`, data),

  update: (id: string, data: { name?: string; isDefault?: boolean }) =>
    apiClient.request<import('@/types').SavedSignature>(`${API_CONFIG.AUTH_SERVICE}/api/signatures/saved/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiClient.delete(`${API_CONFIG.AUTH_SERVICE}/api/signatures/saved/${id}`),
}

// Payment API
export const paymentApi = {
  getPricing: () =>
    apiClient.get<import('@/types').PricingConfigResponse>(`${API_CONFIG.PAYMENT_SERVICE}/api/payments/pricing`),

  listPlans: () =>
    apiClient.get<import('@/types').PlanResponse[]>(`${API_CONFIG.PAYMENT_SERVICE}/api/payments/plans`),

  getMySubscription: () =>
    apiClient.get<import('@/types').SubscriptionWithChargeResponse | null>(`${API_CONFIG.PAYMENT_SERVICE}/api/payments/subscriptions/me`),

  getMySubscriptionStatus: (organizationId?: string) =>
    apiClient.get<import('@/types').SubscriptionAccessStatusResponse>(
      `${API_CONFIG.PAYMENT_SERVICE}/api/payments/subscriptions/me/status${organizationId ? `?organizationId=${organizationId}` : ''}`
    ),

  createSubscription: (planKey: string, organizationId?: string) =>
    apiClient.post<import('@/types').SubscriptionWithChargeResponse>(`${API_CONFIG.PAYMENT_SERVICE}/api/payments/subscriptions`, { 
      planKey,
      organizationId 
    }),
}

// Organization API
export { organizationApi } from './api/organization'
export type { Organization, UserOrganization } from './api/organization'
