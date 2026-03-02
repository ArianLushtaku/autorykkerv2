'use client'

import Navigation from '@/components/marketing/Navigation'
import Footer from '@/components/marketing/Footer'
import PageHero from '@/components/marketing/PageHero'
import Link from 'next/link'
import { Mail, Lock, User, Building, Eye, EyeOff, Check, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { useRouter } from 'next/navigation'

const benefits = [
  "14 dages gratis prøveperiode",
  "Ingen kreditkort påkrævet",
  "Fuld adgang til alle funktioner",
  "Personlig onboarding",
  "24/7 support"
]

export default function SignupPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Use backend API for signup
      await apiClient.signup({
        email: formData.email,
        password: formData.password,
        full_name: `${formData.firstName} ${formData.lastName}`.trim(),
        company: formData.company || undefined
      })

      setSuccess(true)
      
      // Get plan from URL params and pass to onboarding
      const urlParams = new URLSearchParams(window.location.search)
      const plan = urlParams.get('plan') || 'professional'
      const billing = urlParams.get('billing') || 'monthly'
      router.push(`/onboarding?plan=${plan}&billing=${billing}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Der opstod en fejl. Prøv igen.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    try {
      // Google OAuth goes through Supabase directly (this is secure - anon key is designed to be public)
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const urlParams = new URLSearchParams(window.location.search)
      const plan = urlParams.get('plan') || 'professional'
      const billing = urlParams.get('billing') || 'monthly'
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?plan=${plan}&billing=${billing}`
        }
      })
      if (error) {
        setError(error.message)
      }
    } catch (err) {
      setError('Der opstod en fejl med Google tilmelding.')
    }
  }

  if (success) {
    return (
      <>
        <Navigation />
        <PageHero 
          title="Velkommen!"
          subtitle="Din konto er næsten klar. Tjek din email for at komme i gang."
        />
        <main className="bg-gray-50 py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow-lg sm:rounded-2xl sm:px-10 border border-gray-200 text-center">
              <div className="w-16 h-16 bg-lime bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-lime" />
              </div>
              <h2 className="text-2xl font-bold text-navy mb-4">Velkommen til Autorykker!</h2>
              <p className="text-gray-600 mb-6">
                Vi har sendt en bekræftelsesmail til <strong>{formData.email}</strong>. 
                Klik på linket i mailen for at aktivere din konto.
              </p>
              <Link 
                href="/login"
                className="inline-flex justify-center py-3 px-6 border border-transparent text-sm font-medium rounded-xl text-navy bg-lime hover:scale-105 transition-transform"
              >
                Gå til login
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navigation />
      <PageHero 
        title="Kom i gang gratis"
        subtitle="Start din 14 dages gratis prøveperiode i dag. Ingen kreditkort påkrævet."
        showCTA={false}
      />
      <main className="bg-gray-50 py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center mb-8">
            <p className="text-sm text-gray-600">
              Har du allerede en konto?{' '}
              <Link href="/login" className="font-medium text-lime hover:text-navy transition-colors">
                Log ind her
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-lg sm:rounded-2xl sm:px-10 border border-gray-200">
            
            {/* Benefits */}
            <div className="mb-8 p-4 bg-lime bg-opacity-10 rounded-xl">
              <h3 className="text-sm font-medium text-navy mb-3">Inkluderet i din gratis prøveperiode:</h3>
              <ul className="space-y-2">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-700">
                    <Check className="h-4 w-4 text-lime mr-2" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSignup}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    Fornavn
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-3 py-3 pl-10 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-lime focus:border-lime"
                      placeholder="Dit fornavn"
                    />
                    <User className="h-5 w-5 text-gray-400 absolute left-3 top-3.5" />
                  </div>
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Efternavn
                  </label>
                  <div className="mt-1">
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-lime focus:border-lime"
                      placeholder="Dit efternavn"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email adresse
                </label>
                <div className="mt-1 relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="appearance-none block w-full px-3 py-3 pl-10 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-lime focus:border-lime"
                    placeholder="din@email.dk"
                  />
                  <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-3.5" />
                </div>
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                  Virksomhed
                </label>
                <div className="mt-1 relative">
                  <input
                    id="company"
                    name="company"
                    type="text"
                    required
                    value={formData.company}
                    onChange={handleInputChange}
                    className="appearance-none block w-full px-3 py-3 pl-10 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-lime focus:border-lime"
                    placeholder="Din virksomhed"
                  />
                  <Building className="h-5 w-5 text-gray-400 absolute left-3 top-3.5" />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Adgangskode
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="appearance-none block w-full px-3 py-3 pl-10 pr-10 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-lime focus:border-lime"
                    placeholder="Minimum 8 tegn"
                  />
                  <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-3.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Minimum 8 tegn med tal og bogstaver</p>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    required
                    className="h-4 w-4 text-lime focus:ring-lime border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="terms" className="text-gray-700">
                    Jeg accepterer{' '}
                    <Link href="/terms" className="text-lime hover:text-navy transition-colors">
                      handelsbetingelserne
                    </Link>{' '}
                    og{' '}
                    <Link href="/privacy" className="text-lime hover:text-navy transition-colors">
                      privatlivspolitikken
                    </Link>
                  </label>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-navy bg-lime hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Opretter konto...
                    </>
                  ) : (
                    'Start gratis prøveperiode'
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Eller tilmeld dig med</span>
                </div>
              </div>

              <div className="mt-6">
                <button 
                  onClick={handleGoogleSignup}
                  className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="ml-2">Tilmeld dig med Google</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Har du allerede en konto?{' '}
              <Link href="/login" className="font-medium text-lime hover:text-navy transition-colors">
                Log ind her
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
