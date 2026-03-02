'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie_consent')
    if (!consent) {
      // Small delay to avoid flash on page load
      const timer = setTimeout(() => setShowBanner(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const acceptAll = () => {
    localStorage.setItem('cookie_consent', 'all')
    localStorage.setItem('cookie_consent_date', new Date().toISOString())
    setShowBanner(false)
  }

  const acceptNecessary = () => {
    localStorage.setItem('cookie_consent', 'necessary')
    localStorage.setItem('cookie_consent_date', new Date().toISOString())
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 md:p-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-lime rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-navy text-xl">🍪</span>
            </div>
            <h3 className="text-xl font-bold text-navy">Vi bruger cookies</h3>
          </div>
          <button 
            onClick={acceptNecessary}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Luk"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-gray-600 mb-6">
          Vi bruger cookies for at forbedre din oplevelse på vores website. Nødvendige cookies sikrer, 
          at websitet fungerer korrekt. Analytiske cookies hjælper os med at forstå, hvordan du bruger 
          siden, så vi kan forbedre den.{' '}
          <Link href="/cookies" className="text-lime hover:text-navy font-medium transition-colors">
            Læs mere om vores cookies
          </Link>
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={acceptAll}
            className="flex-1 bg-lime text-navy font-bold py-3 px-6 rounded-xl hover:scale-105 transition-transform"
          >
            Accepter alle cookies
          </button>
          <button
            onClick={acceptNecessary}
            className="flex-1 bg-gray-100 text-navy font-bold py-3 px-6 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Kun nødvendige
          </button>
          <Link
            href="/cookies"
            className="flex-1 border-2 border-gray-200 text-navy font-medium py-3 px-6 rounded-xl hover:border-navy transition-colors text-center"
          >
            Indstillinger
          </Link>
        </div>
      </div>
    </div>
  )
}
