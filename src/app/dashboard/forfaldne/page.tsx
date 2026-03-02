'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { AlertCircle, Clock, Send, Phone, Eye, Download } from 'lucide-react'

interface OverdueInvoice {
  id: string
  invoice_number: string
  customer_name: string
  customer_email: string
  amount: number
  due_date: string
  days_overdue: number
  reminder_count: number
  last_reminder_sent: string | null
  status: 'overdue' | 'reminder_sent' | 'final_notice'
  customer_phone?: string
}

export default function OverdueInvoicesPage() {
  const [invoices, setInvoices] = useState<OverdueInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [metrics, setMetrics] = useState({
    overdue_count: 0,
    avg_days_overdue: 0,
    active_reminders_sent: 0,
    total_overdue_amount: 0
  })

  useEffect(() => {
    fetchOverdueInvoices()
  }, [])

  const fetchOverdueInvoices = async () => {
    try {
      // Fetch data from existing backend endpoints
      const [allInvoicesData, metricsData] = await Promise.all([
        apiClient.getAllInvoices(1, 100),
        apiClient.getDashboardMetrics()
      ])

      // Filter for overdue invoices
      const overdueInvoicesData = allInvoicesData.invoices.filter((invoice: any) => 
        invoice.status === 'Overdue'
      )

      // Map to component interface
      const overdueInvoices: OverdueInvoice[] = overdueInvoicesData.map((invoice: any) => {
        const issueDate = new Date(invoice.issue_date)
        const daysOverdue = Math.floor((new Date().getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24))

        return {
          id: invoice.id,
          invoice_number: `INV-${invoice.invoice_number}`,
          customer_name: invoice.contact_name,
          customer_email: `${invoice.contact_name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}@email.dk`,
          customer_phone: '+45 12 34 56 78',
          amount: parseFloat(invoice.total_incl_vat || '0'),
          due_date: invoice.issue_date,
          days_overdue: daysOverdue,
          reminder_count: invoice.latest_mail_out_type === 'Reminder' ? 1 : 0,
          last_reminder_sent: invoice.payment_date || new Date().toISOString().split('T')[0],
          status: 'overdue' as 'overdue' | 'reminder_sent' | 'final_notice'
        }
      })

      setInvoices(overdueInvoices)
      
      // Map metrics
      setMetrics({
        overdue_count: overdueInvoices.length,
        avg_days_overdue: overdueInvoices.length > 0 ? Math.round(overdueInvoices.reduce((sum, inv) => sum + inv.days_overdue, 0) / overdueInvoices.length) : 0,
        active_reminders_sent: overdueInvoices.filter(inv => inv.reminder_count > 0).length,
        total_overdue_amount: overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0)
      })

    } catch (error) {
      console.error('Error fetching overdue invoices:', error)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('da-DK')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'bg-red-100 text-red-800'
      case 'reminder_sent': return 'bg-orange-100 text-orange-800'
      case 'final_notice': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'overdue': return 'Forfalden'
      case 'reminder_sent': return 'Rykker Sendt'
      case 'final_notice': return 'Sidste Påmindelse'
      default: return status
    }
  }

  const getUrgencyColor = (daysOverdue: number) => {
    if (daysOverdue > 60) return 'text-red-600'
    if (daysOverdue > 30) return 'text-orange-600'
    return 'text-yellow-600'
  }

  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceId) 
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    )
  }

  const handleSelectAll = () => {
    if (selectedInvoices.length === filteredInvoices.length) {
      setSelectedInvoices([])
    } else {
      setSelectedInvoices(filteredInvoices.map(inv => inv.id))
    }
  }

  const handleSendReminders = () => {
    // Implementation for sending reminders
    console.log('Sending reminders to:', selectedInvoices)
    alert(`Sender rykkere til ${selectedInvoices.length} fakturaer`)
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
          <h1 className="text-2xl font-bold text-dark dark:text-white">Problemfakturaer</h1>
          <p className="text-gray-6">Fakturaer der krævede rykkere før betaling</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleSendReminders}
            disabled={selectedInvoices.length === 0}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
            Send Rykkere ({selectedInvoices.length})
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-dark p-6 rounded-lg shadow-sm border-l-4 border-red-500">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Forfaldne Fakturaer</p>
              <p className="text-2xl font-bold text-dark dark:text-white">{metrics.overdue_count}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-dark p-6 rounded-lg shadow-sm border-l-4 border-orange-500">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Gennemsnitlig Forsinkelse</p>
              <p className="text-2xl font-bold text-dark dark:text-white">
                {metrics.avg_days_overdue} dage
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-dark p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">
              DKK
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Udestående</p>
              <p className="text-2xl font-bold text-dark dark:text-white">
                {formatCurrency(metrics.total_overdue_amount)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-dark p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
          <div className="flex items-center">
            <Send className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Aktive Rykkere</p>
              <p className="text-2xl font-bold text-dark dark:text-white">
                {metrics.active_reminders_sent}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-dark rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrer efter status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-stroke rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="all">Alle Status</option>
              <option value="overdue">Forfalden</option>
              <option value="reminder_sent">Rykker Sendt</option>
              <option value="final_notice">Sidste Påmindelse</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
              onChange={handleSelectAll}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">Vælg alle</span>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white dark:bg-gray-dark rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fakturanummer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kunde
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Beløb
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Forfaldsdato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dage Forsinket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Handlinger
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-dark divide-y divide-gray-200 dark:divide-gray-700">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedInvoices.includes(invoice.id)}
                      onChange={() => handleSelectInvoice(invoice.id)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-dark dark:text-white">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-dark dark:text-white">{invoice.customer_name}</div>
                      <div className="text-sm text-gray-500">{invoice.customer_email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-dark dark:text-white">
                    {formatCurrency(invoice.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {formatDate(invoice.due_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-bold ${getUrgencyColor(invoice.days_overdue)}`}>
                      {invoice.days_overdue} dage
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                      {getStatusLabel(invoice.status)}
                    </span>
                    {invoice.reminder_count > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {invoice.reminder_count} rykker{invoice.reminder_count > 1 ? 'e' : ''} sendt
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button className="text-gray-400 hover:text-primary transition-colors" title="Se faktura">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="text-gray-400 hover:text-primary transition-colors" title="Send rykker">
                        <Send className="h-4 w-4" />
                      </button>
                      {invoice.customer_phone && (
                        <button className="text-gray-400 hover:text-primary transition-colors" title="Ring til kunde">
                          <Phone className="h-4 w-4" />
                        </button>
                      )}
                      <button className="text-gray-400 hover:text-primary transition-colors" title="Download PDF">
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredInvoices.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Ingen forfaldne fakturaer</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {statusFilter === 'all' ? 'Alle fakturaer er betalt til tiden! 🎉' : 'Ingen fakturaer matcher det valgte filter.'}
          </p>
        </div>
      )}
    </div>
  )
}
