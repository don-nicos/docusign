'use client'

import { useEffect, useState } from 'react'
import { Button } from './ui/Button'

interface InactivityWarningProps {
  /**
   * Si el modal está visible
   */
  isOpen: boolean
  
  /**
   * Tiempo restante en segundos
   */
  timeRemaining: number
  
  /**
   * Callback para extender la sesión
   */
  onExtend: () => void
  
  /**
   * Callback para cerrar sesión
   */
  onLogout: () => void
}

export function InactivityWarning({
  isOpen,
  timeRemaining,
  onExtend,
  onLogout,
}: InactivityWarningProps) {
  const [countdown, setCountdown] = useState(timeRemaining)

  useEffect(() => {
    if (!isOpen) return

    setCountdown(timeRemaining)

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen, timeRemaining])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">Sesión por Expirar</h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 mb-6">
            Tu sesión está por expirar debido a inactividad. ¿Deseas continuar?
          </p>

          {/* Countdown */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-center">
            <p className="text-sm text-gray-600 mb-2">Tiempo restante</p>
            <div className="flex items-center justify-center gap-2">
              <div className="bg-white rounded-lg px-4 py-2 shadow-sm border border-gray-200">
                <span className="text-3xl font-bold text-gray-900">
                  {Math.floor(countdown / 60)}
                </span>
                <span className="text-sm text-gray-500 ml-1">min</span>
              </div>
              <span className="text-2xl font-bold text-gray-400">:</span>
              <div className="bg-white rounded-lg px-4 py-2 shadow-sm border border-gray-200">
                <span className="text-3xl font-bold text-gray-900">
                  {String(countdown % 60).padStart(2, '0')}
                </span>
                <span className="text-sm text-gray-500 ml-1">seg</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onLogout}
              className="flex-1"
            >
              Cerrar Sesión
            </Button>
            <Button
              variant="primary"
              onClick={onExtend}
              className="flex-1"
            >
              Continuar Sesión
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
