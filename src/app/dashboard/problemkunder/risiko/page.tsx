'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { AlertTriangle, TrendingUp, TrendingDown, ArrowLeft, DollarSign, Clock, FileText } from 'lucide-react'

interface ProblemCustomer {
  contact_name: string
  invoice_count: number
  total_amount: number
  overdue_amount: number
  avg_payment_delay: number
  reminder_count: number
  prereminder_count: number
  risk_score: number
  last_invoice_date: string
  status: 'critical' | 'warning' | 'attention' | 'low'
}

export default function RiskAnalysisPage() {
  const [customers, setCustomers] = useState<ProblemCustomer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRiskAnalysis()
  }, [])

  const fetchRiskAnalysis = async () => {
    try {
      // Fetch all problem customers for detailed risk analysis
      const problemCustomersData = await apiClient.getProblemCustomers(100, 20)
      setCustomers(problemCustomersData.customers)
    } catch (error) {
      console.error('Error fetching risk analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency: 'DKK'
    }).format(amount)
  }

  const getRiskFactors = (customer: ProblemCustomer) => {
    const factors = []
    
    // Overdue amount factor
    if (customer.overdue_amount > 0) {
      const overdueRate = (customer.overdue_amount / customer.total_amount) * 100
      factors.push({
        name: 'Udestående Beløb',
        value: `${overdueRate.toFixed(1)}% af total`,
        impact: overdueRate >= 50 ? 'high' : overdueRate >= 25 ? 'medium' : 'low',
        score: Math.min(40, (overdueRate / 100) * 40)
      })
    }

    // Reminder rate factor
    const reminderRate = ((customer.reminder_count + customer.prereminder_count) / customer.invoice_count) * 100
    factors.push({
      name: 'Rykker Frekvens',
      value: `${reminderRate.toFixed(1)}% af fakturaer`,
      impact: reminderRate >= 50 ? 'high' : reminderRate >= 25 ? 'medium' : 'low',
      score: (reminderRate / 100) * 30
    })

    // Payment delay factor
    if (customer.avg_payment_delay > 0) {
      factors.push({
        name: 'Betalingsforsinkelse',
        value: `Ø ${Math.round(customer.avg_payment_delay)} dage`,
        impact: customer.avg_payment_delay >= 30 ? 'high' : customer.avg_payment_delay >= 14 ? 'medium' : 'low',
        score: Math.min(30, (customer.avg_payment_delay / 30) * 30)
      })
    }

    return factors
  }

  const getRecommendedActions = (customer: ProblemCustomer) => {
    const actions = []

    if (customer.status === 'critical') {
      actions.push('🔴 Umiddelbar opfølgning påkrævet')
      actions.push('📞 Ring til kunden i dag')
      actions.push('📧 Send kraftig rykker med betalingsfrist')
      if (customer.overdue_amount > 10000) {
        actions.push('⚖️ Overvej inkasso')
      }
    } else if (customer.status === 'warning') {
      actions.push('🟠 Tæt opfølgning anbefalet')
      actions.push('📧 Send venlig rykker')
      actions.push('📞 Opfølgende opkald om 3-5 dage')
    } else {
      actions.push('🟡 Overvåg betalingsadfærd')
      actions.push('📧 Send påmindelse ved næste faktura')
    }

    return actions
  }

  const getImpactColor = (impact: string) => {
    if (impact === 'high') return 'text-red-600 bg-red-100'
    if (impact === 'medium') return 'text-orange-600 bg-orange-100'
    return 'text-yellow-600 bg-yellow-100'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link 
            href="/dashboard/problemkunder"
            className="flex items-center gap-2 text-primary hover:text-primary/80 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Tilbage til Problemkunder
          </Link>
          <h1 className="text-2xl font-bold text-dark dark:text-white">Risiko Analyse</h1>
          <p className="text-gray-6">Detaljeret risikovurdering og anbefalede handlinger</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-dark p-6 rounded-lg shadow-sm border-l-4 border-red-500">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Kritiske Kunder</p>
              <p className="text-2xl font-bold text-dark dark:text-white">
                {customers.filter(c => c.status === 'critical').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-dark p-6 rounded-lg shadow-sm border-l-4 border-orange-500">
          <div className="flex items-center">
            <TrendingDown className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Gennemsnitlig Risiko</p>
              <p className="text-2xl font-bold text-dark dark:text-white">
                {customers.length > 0 ? Math.round(customers.reduce((acc, c) => acc + c.risk_score, 0) / customers.length) : 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-dark p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Risiko Beløb</p>
              <p className="text-2xl font-bold text-dark dark:text-white">
                {formatCurrency(customers.reduce((acc, c) => acc + c.overdue_amount, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Risk Analysis */}
      <div className="space-y-6">
        {customers.map((customer, index) => {
          const riskFactors = getRiskFactors(customer)
          const actions = getRecommendedActions(customer)

          return (
            <div key={index} className="bg-white dark:bg-gray-dark rounded-lg shadow-sm border border-stroke">
              {/* Customer Header */}
              <div className="p-6 border-b border-stroke">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-dark dark:text-white">{customer.contact_name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {customer.invoice_count} fakturaer • {formatCurrency(customer.total_amount)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Risiko Score</p>
                    <p className={`text-3xl font-bold ${
                      customer.status === 'critical' ? 'text-red-600' :
                      customer.status === 'warning' ? 'text-orange-600' : 'text-yellow-600'
                    }`}>
                      {customer.risk_score}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Risk Factors */}
                  <div>
                    <h4 className="text-lg font-semibold text-dark dark:text-white mb-4 flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-red-500" />
                      Risiko Faktorer
                    </h4>
                    <div className="space-y-3">
                      {riskFactors.map((factor, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div>
                            <p className="font-medium text-dark dark:text-white">{factor.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{factor.value}</p>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getImpactColor(factor.impact)}`}>
                              {factor.impact === 'high' ? 'Høj' : factor.impact === 'medium' ? 'Mellem' : 'Lav'}
                            </span>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              +{factor.score.toFixed(0)} point
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Additional Metrics */}
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Rykkere</p>
                        </div>
                        <p className="text-lg font-bold text-blue-600 mt-1">
                          {customer.reminder_count + customer.prereminder_count}
                        </p>
                      </div>
                      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-600" />
                          <p className="text-sm font-medium text-orange-900 dark:text-orange-100">Forsinkelse</p>
                        </div>
                        <p className="text-lg font-bold text-orange-600 mt-1">
                          {Math.round(customer.avg_payment_delay)} dage
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Recommended Actions */}
                  <div>
                    <h4 className="text-lg font-semibold text-dark dark:text-white mb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      Anbefalede Handlinger
                    </h4>
                    <div className="space-y-2">
                      {actions.map((action, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="flex-1">
                            <p className="text-sm text-dark dark:text-white">{action}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 space-y-2">
                      <button className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                        Send Rykker Nu
                      </button>
                      <button className="w-full px-4 py-2 border border-stroke rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        Planlæg Opfølgning
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {customers.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Ingen risikokunder</h3>
          <p className="text-gray-600 dark:text-gray-400">Alle dine kunder har lav risiko! 🎉</p>
        </div>
      )}
    </div>
  )
}
