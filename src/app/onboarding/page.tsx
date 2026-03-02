'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { Check, Building, CreditCard, Zap, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { PRICING_PLANS, getYearlyMonthlyPrice } from '@/lib/pricing'

// Dynamically import Stripe checkout to avoid SSR issues
const StripeCheckout = dynamic(
  () => import('@/components/StripeCheckout').then(mod => mod.StripeCheckout),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px] bg-gray-50 rounded-xl">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-navy mx-auto mb-4" />
          <p className="text-gray-600">Indlæser betalingsformular...</p>
        </div>
      </div>
    )
  }
)

const steps = [
  { id: 1, name: 'Virksomhed', icon: Building },
  { id: 2, name: 'Plan', icon: Zap },
  { id: 3, name: 'Betaling', icon: CreditCard },
]

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [error, setError] = useState('')
  
  // Form data
  const [companyData, setCompanyData] = useState({
    companyName: '',
    cvr: '',
    address: '',
    city: '',
    postalCode: '',
    phone: '',
    invoiceEmail: '',
  })
  
  const [selectedPlan, setSelectedPlan] = useState(searchParams.get('plan') || 'professional')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
    (searchParams.get('billing') as 'monthly' | 'yearly') || 'monthly'
  )

  useEffect(() => {
    // Check if user is logged in via backend
    const checkUser = async () => {
      try {
        const result = await apiClient.checkAuthAndSubscription()
        if (!result.authenticated) {
          router.push('/signup')
          return
        }
        
        setUserEmail(result.user.full_name || 'Bruger')
        
        // Pre-fill company name if available from backend
        if (result.user.company_name) {
          setCompanyData(prev => ({ ...prev, companyName: result.user.company_name || '' }))
        }
        
        // If already completed onboarding and has access, go to dashboard
        if (result.onboarding_completed && result.has_access) {
          router.push('/dashboard')
          return
        }
      } catch (err) {
        console.error('Auth check failed:', err)
        router.push('/signup')
      } finally {
        setCheckingAuth(false)
      }
    }
    checkUser()
  }, [router])

  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCompanyData({ ...companyData, [e.target.name]: e.target.value })
  }

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    setError('')
    
    try {
      // Save company data and start trial via backend
      await apiClient.completeOnboarding({
        company_name: companyData.companyName,
        cvr: companyData.cvr || undefined,
        address: companyData.address || undefined,
        city: companyData.city || undefined,
        postal_code: companyData.postalCode || undefined,
        phone: companyData.phone || undefined,
        invoice_email: companyData.invoiceEmail || undefined,
        subscription_plan: selectedPlan as 'starter' | 'professional',
        billing_cycle: billingCycle,
      })

      // Redirect to dashboard with trial started
      router.push('/dashboard')
    } catch (err) {
      console.error('Error saving onboarding data:', err)
      setError('Der opstod en fejl. Prøv igen.')
    } finally {
      setLoading(false)
    }
  }

  const selectedPlanData = PRICING_PLANS.find(p => p.id === selectedPlan)
  const price = billingCycle === 'yearly' 
    ? getYearlyMonthlyPrice(selectedPlanData!)
    : selectedPlanData?.monthlyPrice || 0

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-navy mx-auto mb-4" />
          <p className="text-gray-600">Indlæser...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-navy">
            Autorykker
          </Link>
          <span className="text-sm text-gray-500">
            {userEmail}
          </span>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center mb-12">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                currentStep >= step.id 
                  ? 'bg-navy border-navy text-white' 
                  : 'border-gray-300 text-gray-400'
              }`}>
                {currentStep > step.id ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </div>
              <span className={`ml-2 font-medium ${
                currentStep >= step.id ? 'text-navy' : 'text-gray-400'
              }`}>
                {step.name}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-4 ${
                  currentStep > step.id ? 'bg-navy' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          
          {/* Step 1: Company Info */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-navy mb-2">Virksomhedsoplysninger</h2>
              <p className="text-gray-600 mb-8">Fortæl os lidt om din virksomhed</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Virksomhedsnavn *
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={companyData.companyName}
                    onChange={handleCompanyChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-lime focus:border-transparent"
                    placeholder="Din virksomhed ApS"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CVR-nummer
                  </label>
                  <input
                    type="text"
                    name="cvr"
                    value={companyData.cvr}
                    onChange={handleCompanyChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-lime focus:border-transparent"
                    placeholder="12345678"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={companyData.address}
                    onChange={handleCompanyChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-lime focus:border-transparent"
                    placeholder="Vejnavn 123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postnummer
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    value={companyData.postalCode}
                    onChange={handleCompanyChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-lime focus:border-transparent"
                    placeholder="1234"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    By
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={companyData.city}
                    onChange={handleCompanyChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-lime focus:border-transparent"
                    placeholder="København"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={companyData.phone}
                    onChange={handleCompanyChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-lime focus:border-transparent"
                    placeholder="+45 12 34 56 78"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Faktura email
                  </label>
                  <input
                    type="email"
                    name="invoiceEmail"
                    value={companyData.invoiceEmail}
                    onChange={handleCompanyChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-lime focus:border-transparent"
                    placeholder="faktura@virksomhed.dk"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Plan Selection */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-navy mb-2">Vælg din plan</h2>
              <p className="text-gray-600 mb-8">Du kan altid opgradere eller nedgradere senere</p>
              
              {/* Billing Toggle */}
              <div className="flex justify-center mb-8">
                <div className="bg-gray-100 rounded-xl p-1 flex">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      billingCycle === 'monthly' ? 'bg-white text-navy shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    Månedligt
                  </button>
                  <button
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors relative ${
                      billingCycle === 'yearly' ? 'bg-white text-navy shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    Årligt
                    <span className="absolute -top-2 -right-2 bg-lime text-navy text-xs px-2 py-0.5 rounded-full font-bold">
                      Spar 35%
                    </span>
                  </button>
                </div>
              </div>

              {/* Plan Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PRICING_PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`text-left p-6 rounded-xl border-2 transition-all ${
                      selectedPlan === plan.id
                        ? 'border-lime bg-lime/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-navy">{plan.name}</h3>
                        <p className="text-gray-600 text-sm">{plan.description}</p>
                      </div>
                      {plan.popular && (
                        <span className="bg-lime text-navy text-xs px-2 py-1 rounded-full font-bold">
                          Populær
                        </span>
                      )}
                    </div>
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-navy">
                        {billingCycle === 'yearly' ? getYearlyMonthlyPrice(plan) : plan.monthlyPrice}
                      </span>
                      <span className="text-gray-600"> kr/md</span>
                    </div>
                    <ul className="space-y-2">
                      {/* Invoice limit at top, highlighted */}
                      <li className="flex items-center text-sm font-semibold text-navy bg-gray-50 rounded-lg p-2 -mx-1">
                        <Check className="w-4 h-4 text-navy mr-2 flex-shrink-0" />
                        {plan.invoiceLimit}
                      </li>
                      {plan.shortFeatures.map((feature, idx) => (
                        <li key={idx} className="flex items-center text-sm text-gray-600">
                          <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
              
              <p className="text-center text-gray-500 text-sm mt-6">
                14 dages gratis prøveperiode • Ingen binding • Afmeld når som helst
              </p>
            </div>
          )}

          {/* Step 3: Payment */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-navy mb-2">Betalingsoplysninger</h2>
              <p className="text-gray-600 mb-8">Du bliver først opkrævet efter prøveperioden</p>
              
              {/* Order Summary */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <h3 className="font-bold text-navy mb-4">Ordreoversigt</h3>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">{selectedPlanData?.name} ({billingCycle === 'yearly' ? 'Årligt' : 'Månedligt'})</span>
                  <span className="font-medium">{price} kr/md</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                  <span>14 dages gratis prøveperiode</span>
                  <span className="text-green-600">-{price} kr</span>
                </div>
                <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                  <span className="font-bold text-navy">I dag</span>
                  <span className="font-bold text-navy text-xl">0 kr</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Efter prøveperioden: {billingCycle === 'yearly' ? selectedPlanData?.yearlyPrice : price} kr/{billingCycle === 'yearly' ? 'år' : 'md'}
                </p>
              </div>

              {/* Stripe Embedded Checkout */}
              <div className="mb-6">
                <StripeCheckout 
                  plan={selectedPlan} 
                  billingCycle={billingCycle} 
                />
              </div>

              <div className="flex items-start gap-3 text-sm text-gray-600 bg-blue-50 rounded-xl p-4">
                <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Sikker betaling</p>
                  <p className="text-blue-700">Dine betalingsoplysninger er krypteret og sikret af Stripe.</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            {currentStep > 1 ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-navy transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Tilbage
              </button>
            ) : (
              <div />
            )}
            
            {currentStep < 3 && (
              <button
                onClick={handleNext}
                disabled={currentStep === 1 && !companyData.companyName}
                className="flex items-center gap-2 bg-navy text-white px-8 py-3 rounded-xl font-medium hover:bg-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Fortsæt
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {/* On step 3, Stripe Embedded Checkout handles the submit button */}
          </div>
        </div>

      </div>
    </div>
  )
}
