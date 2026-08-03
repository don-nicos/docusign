'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutos
const WARNING_TIME = 5 * 60 * 1000 // 5 minutos antes
const MAX_EXTENSIONS = 1 // Máximo 1 extensión (30 min más)

export function SessionManager() {
  const { logout } = useAuth()
  const router = useRouter()
  const [showWarning, setShowWarning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [extensionsUsed, setExtensionsUsed] = useState(0)
  const [lastActivity, setLastActivity] = useState(Date.now())

  const resetTimer = useCallback(() => {
    setLastActivity(Date.now())
    setShowWarning(false)
  }, [])

  const handleExtendSession = () => {
    if (extensionsUsed < MAX_EXTENSIONS) {
      setExtensionsUsed(prev => prev + 1)
      resetTimer()
      setShowWarning(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/auth/login?session=expired')
  }

  // Detectar actividad del usuario
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    
    const handleActivity = () => {
      if (!showWarning) {
        resetTimer()
      }
    }

    events.forEach(event => {
      document.addEventListener(event, handleActivity)
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [showWarning, resetTimer])

  // Verificar tiempo de sesión
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const timeSinceLastActivity = now - lastActivity
      const remaining = SESSION_TIMEOUT - timeSinceLastActivity

      setTimeLeft(Math.max(0, remaining))

      // Mostrar advertencia antes de cerrar
      if (remaining <= WARNING_TIME && remaining > 0 && !showWarning) {
        console.log('[SessionManager] Mostrando advertencia de sesión')
        setShowWarning(true)
      }

      // Cerrar sesión si se acabó el tiempo Y no se ha extendido
      if (remaining <= 0 && !showWarning) {
        console.log('[SessionManager] Tiempo agotado, cerrando sesión')
        handleLogout()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [lastActivity, showWarning, handleLogout])

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (!showWarning) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 p-3 rounded-full">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Sesión por Expirar</h3>
            <p className="text-sm text-gray-600">Tu sesión está a punto de cerrarse</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-amber-800 mb-2">
            Tu sesión se cerrará automáticamente en:
          </p>
          <p className="text-3xl font-bold text-amber-600 text-center">
            {formatTime(timeLeft)}
          </p>
        </div>

        {extensionsUsed < MAX_EXTENSIONS ? (
          <div className="space-y-3">
            <button
              onClick={handleExtendSession}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Extender Sesión (+30 minutos)
            </button>
            <p className="text-xs text-center text-gray-500">
              Puedes extender tu sesión {MAX_EXTENSIONS - extensionsUsed} vez más
            </p>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800 text-center">
              Has alcanzado el límite de extensiones. La sesión se cerrará automáticamente.
            </p>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full mt-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
        >
          Cerrar Sesión Ahora
        </button>
      </div>
    </div>
  )
}
