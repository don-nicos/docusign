'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { User, AuthSession } from '@/types'
import { authStorage } from '@/lib/auth'
import { authApi } from '@/lib/api'
import { getSessionConfig } from '@/config/session'
import { useInactivityDetector } from '@/hooks/useInactivityDetector'
import { InactivityWarning } from '@/components/InactivityWarning'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (session: AuthSession) => void
  logout: () => void
  isAuthenticated: boolean
  extendSession: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Obtener configuración de sesión
const sessionConfig = getSessionConfig()

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showInactivityWarning, setShowInactivityWarning] = useState(false)
  const router = useRouter()

  const checkSessionExpiration = (): boolean => {
    const loginTime = localStorage.getItem('loginTime')
    if (!loginTime) {
      console.log('[Session] No loginTime found')
      return false
    }

    const elapsed = Date.now() - parseInt(loginTime, 10)
    const isValid = elapsed < sessionConfig.sessionDuration
    
    console.log('[Session] Check:', {
      loginTime: new Date(parseInt(loginTime, 10)).toLocaleString(),
      elapsed: Math.floor(elapsed / 1000 / 60) + ' minutos',
      maxDuration: Math.floor(sessionConfig.sessionDuration / 1000 / 60) + ' minutos',
      isValid
    })
    
    return isValid
  }

  const clearExpiredSession = () => {
    authStorage.clearSession()
    localStorage.removeItem('loginTime')
    localStorage.removeItem('lastActivity')
    setUser(null)
  }

  const updateLastActivity = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastActivity', Date.now().toString())
    }
  }

  const checkInactivity = (): boolean => {
    const lastActivity = localStorage.getItem('lastActivity')
    if (!lastActivity) {
      console.log('[Inactivity] No lastActivity found')
      return true
    }

    const elapsed = Date.now() - parseInt(lastActivity, 10)
    const isValid = elapsed < sessionConfig.inactivityTimeout
    
    console.log('[Inactivity] Check:', {
      lastActivity: new Date(parseInt(lastActivity, 10)).toLocaleString(),
      elapsed: Math.floor(elapsed / 1000 / 60) + ' minutos',
      maxInactivity: Math.floor(sessionConfig.inactivityTimeout / 1000 / 60) + ' minutos',
      isValid
    })
    
    return isValid
  }

  // Detector de inactividad
  const { extendSession: resetInactivityTimer } = useInactivityDetector({
    timeout: sessionConfig.inactivityTimeout,
    warningTime: sessionConfig.warningBeforeTimeout,
    enabled: !!user,
    onInactive: () => {
      // Cerrar sesión por inactividad
      clearExpiredSession()
      router.push('/auth/login?expired=true&reason=inactivity')
    },
    onWarning: () => {
      // Mostrar advertencia
      setShowInactivityWarning(true)
    },
    onActive: () => {
      // Ocultar advertencia si hay actividad
      setShowInactivityWarning(false)
      updateLastActivity()
    },
  })

  // Efecto para inicializar la autenticación (solo al montar)
  useEffect(() => {
    const initAuth = async () => {
      console.log('[Auth] Initializing authentication...')
      const storedUser = authStorage.getUser()
      const token = authStorage.getAccessToken()

      if (storedUser && token) {
        console.log('[Auth] User and token found, checking validity...')
        const sessionValid = checkSessionExpiration()
        const activityValid = checkInactivity()
        
        console.log('[Auth] Validation results:', { sessionValid, activityValid })
        
        // Verificar si la sesión ha expirado
        if (sessionValid && activityValid) {
          console.log('[Auth] ✅ Session valid, setting user')
          setUser(storedUser)
          // NO actualizar lastActivity aquí - dejar que el hook lo maneje
          // updateLastActivity()
        } else {
          // Sesión expirada - determinar razón
          console.log('[Auth] ❌ Session expired, clearing and redirecting')
          clearExpiredSession()
          
          // Redirigir con mensaje apropiado
          if (!sessionValid) {
            console.log('[Auth] Reason: Session timeout')
            router.push('/auth/login?expired=true&reason=timeout')
          } else if (!activityValid) {
            console.log('[Auth] Reason: Inactivity')
            router.push('/auth/login?expired=true&reason=inactivity')
          }
        }
      } else {
        console.log('[Auth] No user or token found')
      }

      setLoading(false)
    }

    initAuth()
  }, []) // Solo ejecutar al montar

  // Efecto separado para validar expiración periódicamente
  useEffect(() => {
    if (!user) return

    // Verificar expiración cada minuto
    const interval = setInterval(() => {
      if (!checkSessionExpiration()) {
        clearExpiredSession()
        router.push('/auth/login?expired=true&reason=timeout')
      } else if (!checkInactivity()) {
        clearExpiredSession()
        router.push('/auth/login?expired=true&reason=inactivity')
      }
    }, sessionConfig.checkInterval)

    return () => clearInterval(interval)
  }, [user, router])

  const extendSession = () => {
    updateLastActivity()
    resetInactivityTimer()
    setShowInactivityWarning(false)
  }

  const login = (session: AuthSession) => {
    authStorage.setSession(session)
    setUser(session.user)
    
    // Guardar timestamp del login y última actividad
    localStorage.setItem('loginTime', Date.now().toString())
    updateLastActivity()
    
    if (session.redirectPath) {
      router.push(session.redirectPath)
    } else {
      router.push('/dashboard')
    }
  }

  const logout = () => {
    authStorage.clearSession()
    localStorage.removeItem('loginTime')
    localStorage.removeItem('lastActivity')
    setUser(null)
    setShowInactivityWarning(false)
    router.push('/auth/login')
  }

  const handleInactivityLogout = () => {
    clearExpiredSession()
    router.push('/auth/login?expired=true&reason=inactivity')
  }

  return (
    <>
      <AuthContext.Provider
        value={{
          user,
          loading,
          login,
          logout,
          isAuthenticated: !!user,
          extendSession,
        }}
      >
        {children}
      </AuthContext.Provider>

      {/* Modal de advertencia de inactividad */}
      <InactivityWarning
        isOpen={showInactivityWarning}
        timeRemaining={Math.floor(sessionConfig.warningBeforeTimeout / 1000)}
        onExtend={extendSession}
        onLogout={handleInactivityLogout}
      />
    </>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
