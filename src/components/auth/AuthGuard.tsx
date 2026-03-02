'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  requireSubscription?: boolean // Set to false to skip subscription check
}

export function AuthGuard({ children, requireSubscription = true }: AuthGuardProps) {
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndSubscription = async () => {
      try {
        // Call backend to check auth and subscription status
        const result = await apiClient.checkAuthAndSubscription()
        
        // If subscription check is not required, grant access if authenticated
        if (!requireSubscription) {
          setHasAccess(result.authenticated)
          setLoading(false)
          return
        }

        // Check if user has completed onboarding
        if (!result.onboarding_completed) {
          router.push('/onboarding')
          return
        }

        // Check if user has access (active subscription or valid trial)
        if (!result.has_access) {
          // Subscription expired or canceled, redirect to onboarding to resubscribe
          router.push('/onboarding?expired=true')
          return
        }

        setHasAccess(true)
      } catch (error) {
        console.error('Auth check error:', error)
        // If API call fails (likely no token), redirect to login
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndSubscription()
  }, [router, requireSubscription])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-navy mx-auto mb-4" />
          <p className="text-gray-600">Indlæser...</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return null // Will redirect
  }

  return <>{children}</>
}
