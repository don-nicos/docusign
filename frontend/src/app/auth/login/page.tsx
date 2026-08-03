'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { authApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import type { ApiError } from '@/types'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [isNewUser, setIsNewUser] = useState(false)
  const [password, setPassword] = useState('')
  const [usePasswordLogin, setUsePasswordLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login: doLogin } = useAuth()

  useEffect(() => {
    // Verificar si la sesión expiró
    const expired = searchParams?.get('expired')
    const reason = searchParams?.get('reason')
    
    if (expired === 'true') {
      if (reason === 'inactivity') {
        setSessionExpiredMessage('Tu sesión ha expirado por inactividad. Por favor inicia sesión nuevamente.')
      } else if (reason === 'timeout') {
        setSessionExpiredMessage('Tu sesión ha expirado por tiempo límite. Por favor inicia sesión nuevamente.')
      } else {
        setSessionExpiredMessage('Tu sesión ha expirado. Por favor inicia sesión nuevamente.')
      }
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isNewUser) {
        await authApi.register(email, fullName, '/dashboard')
        setSuccess(true)
      } else if (usePasswordLogin) {
        // Login con usuario y contraseña
        const session = await authApi.login(email, password)
        doLogin(session)
      } else {
        // Alternativa: magic link
        await authApi.requestMagicLink(email, '/dashboard')
        setSuccess(true)
      }
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.message || 'Ocurrió un error. Por favor intenta nuevamente.')
      
      if (apiError.status === 404 && !isNewUser) {
        setIsNewUser(true)
        setError('Usuario no encontrado. Por favor regístrate.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              ¡Revisa tu correo!
            </h2>
            <p className="text-gray-600 mb-6">
              Te hemos enviado un enlace mágico a <strong>{email}</strong>.
              Haz clic en el enlace para iniciar sesión.
            </p>
            <Button variant="secondary" onClick={() => setSuccess(false)}>
              Volver
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isNewUser ? 'Crear cuenta' : (usePasswordLogin ? 'Iniciar sesión' : 'Iniciar sesión (enlace mágico)')}
          </h1>
          <p className="text-gray-600">
            {isNewUser
              ? 'Crea tu cuenta para comenzar a firmar documentos'
              : (usePasswordLogin ? 'Ingresa tus credenciales' : 'Ingresa tu correo para recibir un enlace de acceso')}
          </p>
        </div>

        {sessionExpiredMessage && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-yellow-800 font-medium">{sessionExpiredMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label="Correo electrónico"
            placeholder="tu@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          {isNewUser && (
            <Input
              type="text"
              label="Nombre completo"
              placeholder="Juan Pérez"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
            />
          )}

          {!isNewUser && usePasswordLogin && (
            <Input
              type="password"
              label="Contraseña"
              placeholder="Tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={loading}
          >
            {isNewUser ? 'Crear cuenta' : (usePasswordLogin ? 'Ingresar' : 'Enviar enlace mágico')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsNewUser(!isNewUser)
              setError('')
            }}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {isNewUser
              ? '¿Ya tienes cuenta? Inicia sesión'
              : '¿No tienes cuenta? Regístrate'}
          </button>
          {!isNewUser && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => {
                  setUsePasswordLogin(!usePasswordLogin)
                  setError('')
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {usePasswordLogin ? 'Usar enlace mágico' : 'Usar usuario y contraseña'}
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Cargando...</h2>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
