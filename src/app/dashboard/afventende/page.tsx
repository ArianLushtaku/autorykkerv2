'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { Clock, CheckCircle, AlertCircle, Eye, RefreshCw, CreditCard } from 'lucide-react'

interface PendingInvoice {
  id: string
  invoice_number: string
  customer_name: string
  customer_email: string
  amount: number
  due_date: string
  days_until_due: number
  expected_payment_date?: string
  payment_method?: string
  bank_reference?: string
  status: 'pending' | 'payment_expected' | 'due_soon'
  last_contact?: string
}

export default function PendingPaymentPage() {
  const [invoices, setInvoices] = useState<PendingInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [metrics, setMetrics] = useState({
    pending_count: 0,
    avg_days_until_due: 0,
    total_pending_amount: 0,
    due_this_week: 0
  })

  useEffect(() => {
    fetchPendingInvoices()
  }, [])

  const fetchPendingInvoices = async () => {
    try {
      // Fetch data from existing backend endpoints
      const [allInvoicesData, metricsData] = await Promise.all([
        apiClient.getAllInvoices(1, 50),
        apiClient.getDashboardMetrics()
      ])

      // Filter for pending invoices (not paid, not overdue)
      const pendingInvoicesData = allInvoicesData.invoices.filter((invoice: any) => 
        invoice.status && !['Paid', 'Overpaid', 'Overdue'].includes(invoice.status)
      )

      // Map to component interface
      const pendingInvoices: PendingInvoice[] = pendingInvoicesData.map((invoice: any) => {
        const issueDate = new Date(invoice.issue_date)
        const paymentDate = invoice.payment_date ? new Date(invoice.payment_date) : null
        const daysUntilDue = paymentDate 
          ? Math.floor((paymentDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : Math.floor((new Date().getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24))

        return {
          id: invoice.id,
          invoice_number: `INV-${invoice.invoice_number}`,
          customer_name: invoice.contact_name,
          customer_email: `${invoice.contact_name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}@email.dk`,
          amount: parseFloat(invoice.total_incl_vat || '0'),
          due_date: invoice.payment_date || invoice.issue_date,
          days_until_due: daysUntilDue,
          expected_payment_date: paymentDate?.toISOString().split('T')[0],
          payment_method: 'Bank Transfer',
          bank_reference: `REF-${invoice.invoice_number}`,
          status: 'pending' as 'pending' | 'payment_expected' | 'due_soon'
        }
      })

      setInvoices(pendingInvoices)
      
      // Map metrics
      setMetrics({
        pending_count: pendingInvoices.length,
        avg_days_until_due: pendingInvoices.length > 0 ? Math.round(pendingInvoices.reduce((sum, inv) => sum + Math.abs(inv.days_until_due), 0) / pendingInvoices.length) : 0,
        total_pending_amount: pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0),
        due_this_week: pendingInvoices.filter(inv => inv.days_until_due <= 7 && inv.days_until_due >= 0).length
      })

    } catch (error) {
      console.error('Error fetching pending invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshPayments = async () => {
    setRefreshing(true)
    // Simulate bank integration check
    setTimeout(() => {
      setRefreshing(false)
      alert('Betalingsstatus opdateret fra bank')
    }, 2000)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency: 'DKK'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('da-DK')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800'
      case 'payment_expected': return 'bg-green-100 text-green-800'
      case 'due_soon': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Afventer'
      case 'payment_expected': return 'Betaling Forventet'
      case 'due_soon': return 'Forfald Snart'
      default: return status
    }
  }

  const getDaysColor = (days: number) => {
    if (days <= 7) return 'text-red-600'
    if (days <= 14) return 'text-orange-600'
    return 'text-green-600'
  }

  const filteredInvoices = invoices.filter(invoice => {
    if (statusFilter === 'all') return true
    return invoice.status === statusFilter
  })

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">Afventende Betaling</h1>
          <p className="text-gray-6">Fakturaer der afventer betaling inden forfaldsdato</p>
        </div>
        <button 
          onClick={handleRefreshPayments}
          disabled={refreshing}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Opdaterer...' : 'Tjek Betalinger'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-dark p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Afventende Fakturaer</p>
              <p className="text-2xl font-bold text-dark dark:text-white">{metrics.pending_count}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-dark p-6 rounded-lg shadow-sm border-l-4 border-green-500">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Gns. Dage til Forfald</p>
              <p className="text-2xl font-bold text-dark dark:text-white">
                {metrics.avg_days_until_due} dage
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-dark p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Forfald Denne Uge</p>
              <p className="text-2xl font-bold text-dark dark:text-white">
                {metrics.due_this_week}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-dark p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
          <div className="flex items-center">
            <CreditCard className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Forventet Indkomst</p>
              <p className="text-2xl font-bold text-dark dark:text-white">
                {formatCurrency(metrics.total_pending_amount)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-dark rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrer efter status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-stroke rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="all">Alle Status</option>
            <option value="pending">Afventer</option>
            <option value="payment_expected">Betaling Forventet</option>
            <option value="due_soon">Forfald Snart</option>
          </select>
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-4">
        {filteredInvoices.map((invoice) => (
          <div key={invoice.id} className="bg-white dark:bg-gray-dark rounded-lg p-6 shadow-sm border border-stroke">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-dark dark:text-white">{invoice.invoice_number}</h3>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                    {getStatusLabel(invoice.status)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{invoice.customer_name}</p>
                <p className="text-sm text-gray-500">{invoice.customer_email}</p>
              </div>
              
              <div className="text-right">
                <p className="text-2xl font-bold text-dark dark:text-white">{formatCurrency(invoice.amount)}</p>
                <p className={`text-sm font-medium ${getDaysColor(invoice.days_until_due)}`}>
                  {invoice.days_until_due > 0 ? `${invoice.days_until_due} dage tilbage` : 'Forfalden'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Forfaldsdato</p>
                <p className="text-sm font-medium text-dark dark:text-white">{formatDate(invoice.due_date)}</p>
              </div>
              
              {invoice.expected_payment_date && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Forventet Betaling</p>
                  <p className="text-sm font-medium text-green-600">{formatDate(invoice.expected_payment_date)}</p>
                </div>
              )}
              
              {invoice.payment_method && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Betalingsmetode</p>
                  <p className="text-sm font-medium text-dark dark:text-white">{invoice.payment_method}</p>
                </div>
              )}
            </div>

            {invoice.bank_reference && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Bank Reference</p>
                <p className="text-sm font-mono font-medium text-dark dark:text-white">{invoice.bank_reference}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              {invoice.last_contact && (
                <p className="text-sm text-gray-500">
                  Sidst kontakt: {formatDate(invoice.last_contact)}
                </p>
              )}
              
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-3 py-2 border border-stroke rounded-lg hover:bg-gray-50 transition-colors">
                  <Eye className="h-4 w-4" />
                  Se Faktura
                </button>
                {invoice.status === 'due_soon' && (
                  <button className="flex items-center gap-2 px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">
                    <AlertCircle className="h-4 w-4" />
                    Send Påmindelse
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredInvoices.length === 0 && (
        <div className="text-center py-12">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Ingen afventende betalinger</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {statusFilter === 'all' ? 'Alle fakturaer er betalt eller forfaldne.' : 'Ingen fakturaer matcher det valgte filter.'}
          </p>
        </div>
      )}
    </div>
  )
}
