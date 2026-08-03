'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { paymentApi } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { ApiError, PlanResponse, SubscriptionWithChargeResponse } from '@/types'

function formatClp(amount: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount)
}

function SubscriptionContent() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [plans, setPlans] = useState<PlanResponse[]>([])
  const [subscription, setSubscription] = useState<SubscriptionWithChargeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const reason = useMemo(() => searchParams?.get('reason'), [searchParams])
  const mp = useMemo(() => searchParams?.get('mp'), [searchParams])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const [plansData, subData] = await Promise.all([
          paymentApi.listPlans(),
          paymentApi.getMySubscription(),
        ])
        setPlans(plansData)
        setSubscription(subData)
      } catch (e) {
        const apiError = e as ApiError
        setError(apiError.message || 'Error al cargar la información de suscripción')
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading && isAuthenticated) {
      load()
    }
  }, [authLoading, isAuthenticated])

  useEffect(() => {
    if (!mp) return
    if (!authLoading && isAuthenticated) {
      if (mp === 'success') {
        setSuccess('Pago aprobado. Estamos activando tu suscripción...')
        setError('')
      } else if (mp === 'pending') {
        setSuccess('Pago pendiente. Te avisaremos cuando se confirme.')
        setError('')
      } else if (mp === 'failure') {
        setError('El pago fue rechazado o cancelado. Puedes intentar nuevamente.')
        setSuccess('')
      }

      paymentApi.getMySubscription()
        .then(subData => setSubscription(subData))
        .catch(() => {})
    }
  }, [mp, authLoading, isAuthenticated])

  const handleSubscribe = async (planKey: string) => {
    try {
      setSubmitting(planKey)
      setError('')
      setSuccess('')
      const result = await paymentApi.createSubscription(planKey)
      setSubscription(result)
      if (result?.checkoutUrl) {
        setSuccess('Redirigiendo a Mercado Pago...')
        window.location.href = result.checkoutUrl
        return
      }
      setSuccess('Suscripción activada correctamente')
    } catch (e) {
      const apiError = e as ApiError
      setError(apiError.message || 'Error al crear la suscripción')
    } finally {
      setSubmitting(null)
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const active = subscription?.subscription?.status === 'ACTIVE'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Suscripción</h1>
          <p className="text-gray-600 mt-1">Elige tu plan y mantén activa tu suscripción</p>
        </div>

        {reason === 'required' && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6">
            Necesitas una suscripción activa para crear solicitudes de firma.
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {plans.map(plan => (
            <Card key={plan.planKey}>
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
                <p className="text-sm text-gray-600 mt-1">{plan.periodMonths} mes(es)</p>

                <div className="mt-4">
                  <div className="text-3xl font-bold text-gray-900">{formatClp(plan.grossAmountClp)}</div>
                  <div className="text-sm text-gray-600">IVA incluido</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Neto: {formatClp(plan.netAmountClp)} | IVA: {formatClp(plan.taxAmountClp)}
                  </div>
                </div>

                <div className="mt-6">
                  <Button
                    variant="primary"
                    className="w-full"
                    disabled={submitting !== null}
                    onClick={() => handleSubscribe(plan.planKey)}
                  >
                    {submitting === plan.planKey ? 'Procesando...' : 'Suscribirme'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card>
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900">Estado actual</h2>
            {subscription ? (
              <div className="mt-3">
                <div className="text-sm text-gray-700">
                  Estado: <span className={active ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>{subscription.subscription.status}</span>
                </div>
                <div className="text-sm text-gray-700 mt-1">Plan: {subscription.subscription.planKey}</div>
                {subscription.subscription.currentPeriodEnd && (
                  <div className="text-sm text-gray-700 mt-1">
                    Vence: {new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString('es-CL')}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 text-sm text-gray-700">Aún no tienes una suscripción.</div>
            )}

            <div className="mt-6">
              <Button variant="secondary" onClick={() => router.push('/dashboard')}>Volver</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function SubscriptionPage() {
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
      <SubscriptionContent />
    </Suspense>
  )
}
