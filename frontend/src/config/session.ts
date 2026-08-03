/**
 * Configuración de sesión y timeouts
 */

export const SESSION_CONFIG = {
  /**
   * Duración máxima de la sesión (tiempo desde el login)
   * Default: 10 minutos (para testing)
   */
  SESSION_DURATION_MS: 10 * 60 * 1000, // 10 minutos

  /**
   * Tiempo de inactividad antes de cerrar sesión
   * Default: 5 minutos (para testing)
   */
  INACTIVITY_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutos

  /**
   * Intervalo de verificación de expiración
   * Default: 30 segundos (para testing más rápido)
   */
  CHECK_INTERVAL_MS: 30 * 1000, // 30 segundos

  /**
   * Tiempo antes de mostrar advertencia de inactividad
   * Default: 1 minuto antes del timeout
   */
  WARNING_BEFORE_TIMEOUT_MS: 1 * 60 * 1000, // 1 minuto
}

/**
 * Eventos que se consideran como actividad del usuario
 */
export const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keypress',
  'scroll',
  'touchstart',
  'click',
] as const

/**
 * Obtener configuración desde variables de entorno (si existen)
 */
export function getSessionConfig() {
  return {
    sessionDuration: process.env.NEXT_PUBLIC_SESSION_DURATION_MS 
      ? parseInt(process.env.NEXT_PUBLIC_SESSION_DURATION_MS) 
      : SESSION_CONFIG.SESSION_DURATION_MS,
    
    inactivityTimeout: process.env.NEXT_PUBLIC_INACTIVITY_TIMEOUT_MS 
      ? parseInt(process.env.NEXT_PUBLIC_INACTIVITY_TIMEOUT_MS) 
      : SESSION_CONFIG.INACTIVITY_TIMEOUT_MS,
    
    checkInterval: process.env.NEXT_PUBLIC_CHECK_INTERVAL_MS 
      ? parseInt(process.env.NEXT_PUBLIC_CHECK_INTERVAL_MS) 
      : SESSION_CONFIG.CHECK_INTERVAL_MS,
    
    warningBeforeTimeout: process.env.NEXT_PUBLIC_WARNING_BEFORE_TIMEOUT_MS 
      ? parseInt(process.env.NEXT_PUBLIC_WARNING_BEFORE_TIMEOUT_MS) 
      : SESSION_CONFIG.WARNING_BEFORE_TIMEOUT_MS,
  }
}
