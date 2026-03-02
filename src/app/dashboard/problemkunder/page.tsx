'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { AlertTriangle, Clock, DollarSign, TrendingDown, Mail, Phone, Calendar, ArrowRight, Download, FileText } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { unparse } from 'papaparse'

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

export default function ProblemCustomersPage() {
  const [customers, setCustomers] = useState<ProblemCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'risk_score' | 'overdue_amount' | 'avg_payment_delay'>('risk_score')
  const [dashboardStats, setDashboardStats] = useState({
    total_outstanding: 0,
    total_overdue: 0,
    overdue_count: 0,
    reminders_need_action: 0
  })

  useEffect(() => {
    fetchProblemCustomers()
  }, [])

  const fetchProblemCustomers = async () => {
    try {
      // Fetch from optimized SQL view - MUCH faster!
      const [problemCustomersData, statsData] = await Promise.all([
        apiClient.getProblemCustomers(100, 20), // Get top 100 problem customers
        apiClient.getDashboardStats()
      ])

      setCustomers(problemCustomersData.customers)
      
      setDashboardStats({
        total_outstanding: statsData.pending_amount + statsData.overdue_amount,
        total_overdue: statsData.overdue_amount,
        overdue_count: statsData.overdue_count,
        reminders_need_action: statsData.overdue_count
      })

    } catch (error) {
      console.error('Error fetching problem customers:', error)
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

  const getRiskColor = (status: string) => {
    if (status === 'critical') return 'text-red-600 bg-red-100'
    if (status === 'warning') return 'text-orange-600 bg-orange-100'
    if (status === 'attention') return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const getRiskLabel = (status: string) => {
    if (status === 'critical') return 'Kritisk Risiko'
    if (status === 'warning') return 'Høj Risiko'
    if (status === 'attention') return 'Mellem Risiko'
    return 'Lav Risiko'
  }

  const sortedCustomers = [...customers].sort((a, b) => {
    switch (sortBy) {
      case 'overdue_amount':
        return b.overdue_amount - a.overdue_amount
      case 'avg_payment_delay':
        return b.avg_payment_delay - a.avg_payment_delay
      default:
        return b.risk_score - a.risk_score
    }
  })

  const exportToCSV = () => {
    // Sort by amount first, then risk score
    const sortedData = [...customers].sort((a, b) => {
      if (b.overdue_amount !== a.overdue_amount) {
        return b.overdue_amount - a.overdue_amount
      }
      return b.risk_score - a.risk_score
    })

    const csvData = sortedData.map(customer => ({
      'Kunde': customer.contact_name,
      'Risiko Score': customer.risk_score,
      'Risiko Status': getRiskLabel(customer.status),
      'Antal Fakturaer': customer.invoice_count,
      'Total Beløb': customer.total_amount,
      'Udestående Beløb': customer.overdue_amount,
      'Antal Rykkere': customer.reminder_count,
      'Antal Påmindelser': customer.prereminder_count,
      'Gns. Forsinkelse (dage)': Math.round(customer.avg_payment_delay),
      'Sidst Faktura': formatDate(customer.last_invoice_date)
    }))

    const csv = unparse(csvData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `problemkunder_rapport_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = () => {
    // Sort by amount first, then risk score
    const sortedData = [...customers].sort((a, b) => {
      if (b.overdue_amount !== a.overdue_amount) {
        return b.overdue_amount - a.overdue_amount
      }
      return b.risk_score - a.risk_score
    })

    const doc = new jsPDF()
    
    // Add title
    doc.setFontSize(18)
    doc.text('Problemkunder Rapport', 14, 22)
    
    // Add date
    doc.setFontSize(11)
    doc.text(`Genereret: ${new Date().toLocaleDateString('da-DK')}`, 14, 30)
    
    // Add summary stats
    doc.setFontSize(10)
    doc.text(`Total antal problemkunder: ${customers.length}`, 14, 38)
    doc.text(`Kritiske kunder: ${customers.filter(c => c.status === 'critical').length}`, 14, 44)
    doc.text(`Total udestående: ${formatCurrency(dashboardStats.total_outstanding)}`, 14, 50)
    
    // Prepare table data
    const tableData = sortedData.map(customer => [
      customer.contact_name,
      getRiskLabel(customer.status),
      formatCurrency(customer.overdue_amount),
      customer.invoice_count.toString(),
      customer.reminder_count.toString()
    ])

    // Add table
    autoTable(doc, {
      startY: 58,
      head: [['Kunde', 'Status', 'Udestående', 'Fakturaer', 'Rykkere']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 35 },
        2: { cellWidth: 35 },
        3: { cellWidth: 30 },
        4: { cellWidth: 30 }
      }
    })

    doc.save(`problemkunder_rapport_${new Date().toISOString().split('T')[0]}.pdf`)
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white mb-2">Problemkunder</h1>
          <p className="text-gray-600 dark:text-gray-400">Kunder med betalingsudfordringer og høj risiko</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 border border-stroke dark:border-dark-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <FileText className="h-4 w-4" />
            Eksporter CSV
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Download className="h-4 w-4" />
            Eksporter PDF
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <Clock className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Gennemsnitlig Forsinkelse</p>
              <p className="text-2xl font-bold text-dark dark:text-white">
                {customers.length > 0 ? Math.round(customers.reduce((acc, c) => acc + c.avg_payment_delay, 0) / customers.length) : 0} dage
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-dark p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Udestående</p>
              <p className="text-2xl font-bold text-dark dark:text-white">
                {formatCurrency(dashboardStats.total_outstanding)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-dark p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center">
            <TrendingDown className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Forfaldne Fakturaer</p>
              <p className="text-2xl font-bold text-dark dark:text-white">
                {dashboardStats.overdue_count}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-dark rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sorter efter:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-stroke rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="risk_score">Risiko Score</option>
            <option value="overdue_amount">Udestående Beløb</option>
            <option value="avg_payment_delay">Gennemsnitlig Forsinkelse</option>
          </select>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white dark:bg-gray-dark rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-stroke dark:border-dark-3">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Kunde
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Risiko
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Udestående
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fakturaer
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Rykkere
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Gns. Forsinkelse
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Handlinger
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stroke dark:divide-dark-3">
              {sortedCustomers.map((customer, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-dark dark:text-white">
                        {customer.contact_name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Sidst faktura: {formatDate(customer.last_invoice_date)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(customer.status)}`}>
                      {getRiskLabel(customer.status)}
                    </span>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Score: {customer.risk_score}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-sm font-bold text-red-600">
                      {formatCurrency(customer.overdue_amount)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      af {formatCurrency(customer.total_amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="text-sm font-medium text-dark dark:text-white">
                      {customer.invoice_count}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="text-sm text-dark dark:text-white">
                      {customer.reminder_count} / {customer.prereminder_count}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      rykkere / påmind.
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="text-sm font-medium text-orange-600">
                      {Math.round(customer.avg_payment_delay)} dage
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Send Rykker">
                        <Mail className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Ring Op">
                        <Phone className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {customers.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Ingen problemkunder</h3>
          <p className="text-gray-600 dark:text-gray-400">Alle dine kunder betaler til tiden! 🎉</p>
        </div>
      )}
    </div>
  )
}
