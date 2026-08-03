import { useEffect, useRef, useCallback } from 'react'
import { ACTIVITY_EVENTS } from '@/config/session'

interface UseInactivityDetectorOptions {
  /**
   * Tiempo de inactividad en milisegundos antes de ejecutar el callback
   */
  timeout: number
  
  /**
   * Callback a ejecutar cuando se detecta inactividad
   */
  onInactive: () => void
  
  /**
   * Callback opcional a ejecutar cuando hay actividad
   */
  onActive?: () => void
  
  /**
   * Callback opcional a ejecutar antes del timeout (advertencia)
   */
  onWarning?: () => void
  
  /**
   * Tiempo en ms antes del timeout para mostrar advertencia
   */
  warningTime?: number
  
  /**
   * Si está habilitado o no
   */
  enabled?: boolean
}

/**
 * Hook para detectar inactividad del usuario
 * 
 * Escucha eventos de mouse, teclado, scroll, etc.
 * y ejecuta un callback después de un período de inactividad.
 */
export function useInactivityDetector({
  timeout,
  onInactive,
  onActive,
  onWarning,
  warningTime,
  enabled = true,
}: UseInactivityDetectorOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const hasShownWarningRef = useRef<boolean>(false)

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
      warningTimeoutRef.current = null
    }
  }, [])

  const resetTimer = useCallback(() => {
    if (!enabled) return

    clearTimers()
    const now = Date.now()
    lastActivityRef.current = now
    hasShownWarningRef.current = false

    // Actualizar localStorage para persistir entre recargas
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastActivity', now.toString())
    }

    // Llamar callback de actividad si existe
    if (onActive) {
      onActive()
    }

    // Configurar timeout de inactividad
    timeoutRef.current = setTimeout(() => {
      onInactive()
    }, timeout)

    // Configurar advertencia si está configurada
    if (onWarning && warningTime && warningTime < timeout) {
      warningTimeoutRef.current = setTimeout(() => {
        if (!hasShownWarningRef.current) {
          hasShownWarningRef.current = true
          onWarning()
        }
      }, timeout - warningTime)
    }
  }, [enabled, timeout, onInactive, onActive, onWarning, warningTime, clearTimers])

  useEffect(() => {
    if (!enabled) {
      clearTimers()
      return
    }

    // Inicializar timer
    resetTimer()

    // Agregar event listeners para detectar actividad
    const handleActivity = () => {
      resetTimer()
    }

    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity)
    })

    // Cleanup
    return () => {
      clearTimers()
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [enabled, resetTimer, clearTimers])

  /**
   * Obtener tiempo desde la última actividad
   */
  const getTimeSinceLastActivity = useCallback(() => {
    return Date.now() - lastActivityRef.current
  }, [])

  /**
   * Resetear manualmente el timer (útil para extender sesión)
   */
  const extendSession = useCallback(() => {
    resetTimer()
  }, [resetTimer])

  return {
    getTimeSinceLastActivity,
    extendSession,
  }
}
