'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { apiClient } from '@/lib/api-client'
import { Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Create Supabase client to get the session from the URL hash
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // Get session from URL (Supabase puts tokens in the hash)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Session error:', sessionError)
          setError('Kunne ikke hente session. Prøv igen.')
          return
        }

        if (!session) {
          // Try to exchange the code for a session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(
            window.location.href
          )
          
          if (exchangeError || !data.session) {
            console.error('Exchange error:', exchangeError)
            setError('Kunne ikke logge ind. Prøv igen.')
            return
          }
          
          // Store the session in our API client
          apiClient.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at || Math.floor(Date.now() / 1000) + 3600
          })
        } else {
          // Store the session in our API client
          apiClient.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at || Math.floor(Date.now() / 1000) + 3600
          })
        }

        // Check if user has completed onboarding
        const authCheck = await apiClient.checkAuthAndSubscription()
        
        if (!authCheck.onboarding_completed) {
          // Redirect to onboarding with plan params
          const plan = searchParams.get('plan') || 'professional'
          const billing = searchParams.get('billing') || 'monthly'
          router.push(`/onboarding?plan=${plan}&billing=${billing}`)
        } else if (authCheck.has_access) {
          // Redirect to dashboard
          router.push('/dashboard')
        } else {
          // Subscription expired
          router.push('/onboarding?expired=true')
        }
      } catch (err) {
        console.error('Callback error:', err)
        setError('Der opstod en fejl. Prøv igen.')
      }
    }

    handleCallback()
  }, [router, searchParams])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="text-navy underline"
          >
            Tilbage til login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-navy mx-auto mb-4" />
        <p className="text-gray-600">Logger ind...</p>
      </div>
    </div>
  )
}
