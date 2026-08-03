/**
 * Utilidades para trazabilidad end-to-end
 * 
 * Genera y gestiona trace IDs que viajan desde el frontend hasta el backend
 * y se guardan en la base de datos para trazabilidad completa.
 */

export const TRACE_ID_HEADER = 'X-Trace-Id'
export const TRACE_ID_STORAGE_KEY = 'docusing_trace_id'

/**
 * Genera un nuevo trace ID (UUID v4)
 */
export function generateTraceId(): string {
  // Usar crypto.randomUUID() si está disponible (navegadores modernos)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  
  // Fallback: generar UUID v4 manualmente
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Obtiene el trace ID actual de la sesión o genera uno nuevo
 */
export function getOrCreateTraceId(): string {
  if (typeof window === 'undefined') {
    return generateTraceId()
  }

  let traceId = sessionStorage.getItem(TRACE_ID_STORAGE_KEY)
  
  if (!traceId) {
    traceId = generateTraceId()
    sessionStorage.setItem(TRACE_ID_STORAGE_KEY, traceId)
  }
  
  return traceId
}

/**
 * Limpia el trace ID de la sesión
 */
export function clearTraceId(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(TRACE_ID_STORAGE_KEY)
  }
}

/**
 * Crea headers con el trace ID incluido
 */
export function createTracedHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
  const traceId = getOrCreateTraceId()
  
  return {
    [TRACE_ID_HEADER]: traceId,
    ...additionalHeaders
  }
}

/**
 * Hook para logging con trace ID
 */
export function logWithTrace(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>): void {
  const traceId = getOrCreateTraceId()
  const timestamp = new Date().toISOString()
  
  const logData = {
    timestamp,
    traceId,
    level,
    message,
    ...data
  }
  
  console[level](`[${traceId}] ${message}`, logData)
}
