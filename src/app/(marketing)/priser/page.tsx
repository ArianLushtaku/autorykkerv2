'use client'

import PageHero from '@/components/marketing/PageHero'
import { Check, X, Calculator, Users } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { PRICING_PLANS, getYearlyMonthlyPrice } from '@/lib/pricing'

export default function PriserPage() {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <>
      <PageHero 
        title="Priser"
        subtitle="Vælg den plan der passer til din virksomhed. Alle planer inkluderer fuld support og ingen binding."
        showCTA={true}
        ctaText="Start gratis prøveperiode"
      />
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {/* Billing Toggle */}
          <div className="flex justify-center mb-12">
            <div className="bg-gray-100 rounded-xl p-1 flex">
              <button
                onClick={() => setIsYearly(false)}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  !isYearly ? 'bg-white text-navy shadow-sm' : 'text-gray-600'
                }`}
              >
                Månedligt
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`px-6 py-3 rounded-lg font-medium transition-colors relative ${
                  isYearly ? 'bg-white text-navy shadow-sm' : 'text-gray-600'
                }`}
              >
                Årligt
                <span className="absolute -top-2 -right-2 bg-lime text-navy text-xs px-2 py-1 rounded-full font-bold">
                  Spar 35%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
            {PRICING_PLANS.map((plan, index) => (
              <div key={index} className={`bg-white rounded-2xl p-8 relative flex flex-col ${
                plan.popular ? 'border-2 border-lime md:-my-4 shadow-xl' : 'border border-gray-200'
              }`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-lime text-navy px-4 py-1 rounded-full text-sm font-bold">
                      Mest populær
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-navy mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-6">{plan.description}</p>
                  
                  <div className="mb-6">
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-navy">
                        {isYearly ? getYearlyMonthlyPrice(plan) : plan.monthlyPrice}
                      </span>
                      <span className="text-gray-600 ml-1"> kr/måned</span>
                    </div>
                    {isYearly && (
                      <div className="text-sm text-gray-500 mt-1">
                        Faktureret årligt ({plan.yearlyPrice} kr/år)
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                  {plan.limitations.map((limitation, idx) => (
                    <div key={idx} className="flex items-center opacity-50">
                      <X className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                      <span className="text-gray-500">{limitation}</span>
                    </div>
                  ))}
                </div>

                <Link 
                  href={`/signup?plan=${plan.id}&billing=${isYearly ? 'yearly' : 'monthly'}`}
                  className={`block w-full font-bold py-3 px-6 rounded-xl hover:scale-105 transition-transform text-center ${
                    plan.popular 
                      ? 'bg-lime text-navy' 
                      : 'bg-gray-100 text-navy hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* ROI Calculator */}
          <div className="bg-gray-50 rounded-2xl p-8 mb-20">
            <div className="text-center mb-12">
              <Calculator className="h-16 w-16 text-navy mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-navy mb-6">
                Beregn din besparelse
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Se hvor meget Autorykker kan spare din virksomhed årligt
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-4xl mx-auto">
              <div className="bg-white rounded-xl p-6">
                <div className="text-3xl font-bold text-navy mb-2">15 timer</div>
                <div className="text-gray-600 mb-4">Spart per måned</div>
                <div className="text-sm text-gray-500">Gennemsnitlig tidsbesparelse</div>
              </div>
              <div className="bg-white rounded-xl p-6">
                <div className="text-3xl font-bold text-navy mb-2">70%</div>
                <div className="text-gray-600 mb-4">Reduktion i udestående</div>
                <div className="text-sm text-gray-500">Hurtigere betalinger</div>
              </div>
              <div className="bg-white rounded-xl p-6">
                <div className="text-3xl font-bold text-navy mb-2">25%</div>
                <div className="text-gray-600 mb-4">Forbedret cash flow</div>
                <div className="text-sm text-gray-500">Øget likviditet</div>
              </div>
            </div>

            <div className="text-center mt-8">
              <Link 
                href="/roi-regner"
                className="inline-block bg-lime text-navy font-bold px-8 py-4 rounded-xl hover:scale-105 transition-transform"
              >
                Beregn din ROI
              </Link>
            </div>
          </div>

          {/* Enterprise Features */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <Users className="h-16 w-16 text-navy mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-navy mb-6">
                Enterprise funktioner
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Avancerede funktioner til virksomheder med højt volumen
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  title: "Custom SMS Gateway",
                  description: "Betal kun 0,30 kr per SMS i stedet for 1 kr - spar 70% på SMS omkostninger"
                },
                {
                  title: "Ubegrænset fakturaer",
                  description: "Ingen grænser for antal fakturaer du kan håndtere hver måned"
                },
                {
                  title: "Ubegrænset brugere",
                  description: "Tilføj så mange teammedlemmer som du har brug for"
                },
                {
                  title: "API adgang",
                  description: "Integrer Autorykker direkte med dine egne systemer"
                },
                {
                  title: "Prioriteret support",
                  description: "Hurtigere svartider og direkte kontakt til support teamet"
                },
                {
                  title: "Dedikeret onboarding",
                  description: "Personlig hjælp til at komme i gang og optimere din opsætning"
                }
              ].map((feature, index) => (
                <div key={index} className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-navy mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
