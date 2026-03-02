'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'
import Link from 'next/link'

export default function OnboardingSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    
    if (!sessionId) {
      setStatus('error')
      setError('Ingen session ID fundet')
      return
    }

    const checkStatus = async () => {
      try {
        const result = await apiClient.getSessionStatus(sessionId)
        
        if (result.status === 'complete' && result.payment_status === 'paid') {
          setStatus('success')
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            router.push('/dashboard')
          }, 3000)
        } else {
          setStatus('error')
          setError(`Betaling ikke gennemført. Status: ${result.status}`)
        }
      } catch (err) {
        console.error('Failed to check session status:', err)
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Kunne ikke verificere betaling')
      }
    }

    checkStatus()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 animate-spin text-navy mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-navy mb-2">Verificerer betaling...</h1>
            <p className="text-gray-600">Vent venligst mens vi bekræfter din betaling.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-navy mb-2">Velkommen til Autorykker!</h1>
            <p className="text-gray-600 mb-6">
              Din konto er nu aktiv. Du har 14 dages gratis prøveperiode.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Du bliver automatisk sendt til dit dashboard om et øjeblik...
            </p>
            <Link
              href="/dashboard"
              className="inline-block bg-lime text-navy font-bold px-8 py-3 rounded-xl hover:scale-105 transition-transform"
            >
              Gå til dashboard
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-navy mb-2">Noget gik galt</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <Link
                href="/onboarding"
                className="block bg-navy text-white font-bold px-8 py-3 rounded-xl hover:bg-navy/90 transition-colors"
              >
                Prøv igen
              </Link>
              <Link
                href="/kontakt"
                className="block text-gray-600 hover:text-navy transition-colors"
              >
                Kontakt support
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
