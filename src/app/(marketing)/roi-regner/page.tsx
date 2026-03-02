'use client'

import PageHero from '@/components/marketing/PageHero'
import { Calculator, TrendingUp, Clock } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function ROIRegnerPage() {
  const [monthlyInvoices, setMonthlyInvoices] = useState(100)
  const [averageInvoiceAmount, setAverageInvoiceAmount] = useState(5000)
  const [currentPaymentDays, setCurrentPaymentDays] = useState(45)
  const [timeSpentPerMonth, setTimeSpentPerMonth] = useState(20)
  const [hourlyRate, setHourlyRate] = useState(500)

  // Danish number formatter
  const formatDanishNumber = (num: number) => {
    return Math.round(num).toLocaleString('da-DK')
  }
  
  // Calculated values
  const [results, setResults] = useState({
    timeSaved: 0,
    timeSavings: 0,
    paymentImprovement: 0,
    cashFlowImprovement: 0,
    totalMonthlySavings: 0,
    totalYearlySavings: 0,
    roiPercentage: 0
  })

  const autorykkerCost = 599 // Professional plan

  useEffect(() => {
    // Calculate time savings (85% reduction in manual work)
    const timeSaved = timeSpentPerMonth * 0.85
    const timeSavings = timeSaved * hourlyRate

    // Calculate payment improvement (from 45 days to 15 days average)
    const newPaymentDays = 15
    const paymentImprovement = ((currentPaymentDays - newPaymentDays) / currentPaymentDays) * 100
    
    // Calculate cash flow improvement (simplified - just focus on time savings)
    // Cash flow improvement is real but hard to quantify precisely, so we focus on measurable time savings
    const cashFlowImprovement = 0 // Removed complex calculation

    // Total savings (primarily time savings which are measurable)
    const totalMonthlySavings = timeSavings
    const totalYearlySavings = totalMonthlySavings * 12
    
    // ROI calculation
    const yearlyInvestment = autorykkerCost * 12
    const roiPercentage = ((totalYearlySavings - yearlyInvestment) / yearlyInvestment) * 100

    setResults({
      timeSaved,
      timeSavings,
      paymentImprovement,
      cashFlowImprovement,
      totalMonthlySavings,
      totalYearlySavings,
      roiPercentage
    })
  }, [monthlyInvoices, averageInvoiceAmount, currentPaymentDays, timeSpentPerMonth, hourlyRate])

  return (
    <>
      <PageHero 
        title="ROI Regner"
        subtitle="Beregn hvor meget Autorykker kan spare din virksomhed årligt med vores interaktive ROI calculator."
        showCTA={true}
        ctaText="Start gratis prøveperiode"
        ctaLink="/signup"
      />
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Calculator Inputs */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <div className="flex items-center mb-8">
                <Calculator className="h-8 w-8 text-navy mr-3" />
                <h2 className="text-2xl font-bold text-navy">Indtast dine oplysninger</h2>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Antal fakturaer per måned
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="1000"
                    value={monthlyInvoices}
                    onChange={(e) => setMonthlyInvoices(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>10</span>
                    <span className="font-bold text-navy">{monthlyInvoices}</span>
                    <span>1000+</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Gennemsnitlig fakturabeløb (kr)
                  </label>
                  <input
                    type="range"
                    min="500"
                    max="50000"
                    step="500"
                    value={averageInvoiceAmount}
                    onChange={(e) => setAverageInvoiceAmount(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>500 kr</span>
                    <span className="font-bold text-navy">{formatDanishNumber(averageInvoiceAmount)} kr</span>
                    <span>50.000+ kr</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Nuværende gennemsnitlige betalingsdage
                  </label>
                  <input
                    type="range"
                    min="14"
                    max="90"
                    value={currentPaymentDays}
                    onChange={(e) => setCurrentPaymentDays(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>14 dage</span>
                    <span className="font-bold text-navy">{currentPaymentDays} dage</span>
                    <span>90+ dage</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Timer brugt på debitorstyring per måned
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={timeSpentPerMonth}
                    onChange={(e) => setTimeSpentPerMonth(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>5 timer</span>
                    <span className="font-bold text-navy">{timeSpentPerMonth} timer</span>
                    <span>100+ timer</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Timeløn for administrativt arbejde (kr)
                  </label>
                  <input
                    type="range"
                    min="200"
                    max="1000"
                    step="50"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>200 kr</span>
                    <span className="font-bold text-navy">{hourlyRate} kr</span>
                    <span>1000+ kr</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-6">
              <div className="bg-navy text-white rounded-2xl p-8">
                <h2 className="text-2xl font-bold mb-6 flex items-center">
                  <TrendingUp className="h-8 w-8 text-lime mr-3" />
                  Dine besparelser
                </h2>

                <div className="space-y-6">
                  <div className="bg-white bg-opacity-10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300">Tidsbesparelse per måned</span>
                      <Clock className="h-5 w-5 text-lime" />
                    </div>
                    <div className="text-2xl font-bold text-lime">
                      {results.timeSaved.toFixed(1)} timer
                    </div>
                    <div className="text-sm text-gray-300">
                      Værdi: {formatDanishNumber(results.timeSavings)} kr/måned
                    </div>
                  </div>

                  <div className="bg-white bg-opacity-10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300">Forbedret betalingstid</span>
                      <TrendingUp className="h-5 w-5 text-lime" />
                    </div>
                    <div className="text-2xl font-bold text-lime">
                      {results.paymentImprovement.toFixed(0)}% hurtigere
                    </div>
                    <div className="text-sm text-gray-300">
                      Fra {currentPaymentDays} til 15 dage i gennemsnit
                    </div>
                  </div>
                </div>
              </div>

              {/* Total ROI */}
              <div className="bg-lime text-navy rounded-2xl p-8">
                <h3 className="text-xl font-bold mb-4">Samlet besparelse</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <div className="text-sm opacity-75">Per måned</div>
                    <div className="text-2xl font-bold">
                      {formatDanishNumber(results.totalMonthlySavings)} kr
                    </div>
                  </div>
                  <div>
                    <div className="text-sm opacity-75">Per år</div>
                    <div className="text-2xl font-bold">
                      {formatDanishNumber(results.totalYearlySavings)} kr
                    </div>
                  </div>
                </div>

                <div className="border-t border-navy border-opacity-20 pt-4">
                  <div className="text-sm opacity-75 mb-1">ROI efter første år</div>
                  <div className="text-3xl font-bold">
                    {results.roiPercentage > 0 ? '+' : ''}{results.roiPercentage.toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="bg-gray-50 rounded-2xl p-6 text-center">
                <h3 className="text-lg font-bold text-navy mb-3">
                  Klar til at realisere disse besparelser?
                </h3>
                <p className="text-gray-600 mb-6">
                  Start din gratis 14-dages prøveperiode i dag
                </p>
                <Link 
                  href="/signup"
                  className="bg-lime text-navy font-bold px-8 py-4 rounded-xl hover:scale-105 transition-transform inline-block"
                >
                  Start gratis prøveperiode
                </Link>
              </div>
            </div>
          </div>

          {/* Assumptions */}
          <div className="mt-20 bg-gray-50 rounded-2xl p-8">
            <h3 className="text-xl font-bold text-navy mb-6">Beregningsgrundlag</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-gray-600">
              <div>
                <h4 className="font-semibold text-navy mb-3">Tidsbesparelser</h4>
                <ul className="space-y-2">
                  <li>• 85% reduktion i manuel debitorstyring</li>
                  <li>• Automatiske påmindelser og opfølgning</li>
                  <li>• Eliminering af manuel dataindtastning</li>
                  <li>• Automatisk rapportering og analyse</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-navy mb-3">Betalingsforbedringer</h4>
                <ul className="space-y-2">
                  <li>• Gennemsnitlig reduktion til 15 dages betaling</li>
                  <li>• 70% færre udestående tilgodehavender</li>
                  <li>• Forbedret cash flow gennem hurtigere betalinger</li>
                  <li>• Reduceret kreditrisiko og tab på debitorer</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-6">
              * Beregningerne er baseret på gennemsnitlige resultater fra eksisterende Autorykker kunder. 
              Faktiske resultater kan variere afhængigt af branche, kundebase og implementering.
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
