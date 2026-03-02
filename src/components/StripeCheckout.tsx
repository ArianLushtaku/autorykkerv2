'use client'

import { useCallback, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js'
import { apiClient } from '@/lib/api-client'
import { Loader2 } from 'lucide-react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface StripeCheckoutProps {
  plan: string
  billingCycle: 'monthly' | 'yearly'
}

export function StripeCheckout({ plan, billingCycle }: StripeCheckoutProps) {
  const [error, setError] = useState<string | null>(null)

  const fetchClientSecret = useCallback(async () => {
    try {
      const result = await apiClient.createCheckoutSession(plan, billingCycle)
      return result.clientSecret
    } catch (err) {
      console.error('Failed to create checkout session:', err)
      setError(err instanceof Error ? err.message : 'Kunne ikke oprette betalingssession')
      throw err
    }
  }, [plan, billingCycle])

  const options = { fetchClientSecret }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
        <p className="font-medium">Fejl ved indlæsning af betaling</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div id="checkout" className="min-h-[400px]">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  )
}

export function StripeCheckoutLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px] bg-gray-50 rounded-xl">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-navy mx-auto mb-4" />
        <p className="text-gray-600">Indlæser betalingsformular...</p>
      </div>
    </div>
  )
}
