'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { 
  Moon, Sun, LayoutDashboard, Users, Settings, Bell, 
  Search, AlertCircle, Clock, TrendingUp, TrendingDown,
  Zap, Building2, Menu, X, Sparkles, Download, FileText,
  ChevronLeft, Timer, Receipt, Mail, Phone, ExternalLink,
  ArrowUpRight, ArrowDownRight, MoreHorizontal, Filter, AlertTriangle
} from 'lucide-react'
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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  return isMobile
}

export default function ProblemCustomersV4Page() {
  const isMobile = useIsMobile()
  const [darkMode, setDarkMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [customers, setCustomers] = useState<ProblemCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'risk_score' | 'overdue_amount' | 'avg_payment_delay'>('risk_score')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [dashboardStats, setDashboardStats] = useState({
    total_outstanding: 0,
    overdue_count: 0,
    avg_delay: 0,
    total_reminders: 0,
  })

  useEffect(() => {
    fetchProblemCustomers()
  }, [])

  const fetchProblemCustomers = async () => {
    try {
      const [problemCustomersData, statsData] = await Promise.all([
        apiClient.getProblemCustomers(100, 20),
        apiClient.getDashboardStats()
      ])
      setCustomers(problemCustomersData.customers)
      
      const totalReminders = problemCustomersData.customers.reduce((acc: number, c: ProblemCustomer) => acc + c.reminder_count + c.prereminder_count, 0)
      // Only include customers with actual payment delays (exclude 0d = never paid)
      const customersWithPayments = problemCustomersData.customers.filter((c: ProblemCustomer) => c.avg_payment_delay > 0)
      const avgDelay = customersWithPayments.length > 0 
        ? customersWithPayments.reduce((acc: number, c: ProblemCustomer) => acc + c.avg_payment_delay, 0) / customersWithPayments.length
        : 0
      
      setDashboardStats({
        total_outstanding: statsData.pending_amount + statsData.overdue_amount,
        overdue_count: statsData.overdue_count,
        avg_delay: avgDelay,
        total_reminders: totalReminders,
      })
    } catch (error) {
      console.error('Error fetching problem customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 }).format(amount) + ' kr'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('da-DK')
  }

  const getStatusInfo = (customer: ProblemCustomer) => {
    if (customer.risk_score >= 70) return { label: 'Kritisk', color: theme.info, bg: theme.infoBg }
    if (customer.risk_score >= 50) return { label: 'Høj risiko', color: theme.info, bg: theme.infoBg }
    if (customer.risk_score >= 30) return { label: 'Moderat', color: theme.primary, bg: theme.primaryMuted }
    return { label: 'Lav', color: theme.success, bg: theme.successBg }
  }

  const filteredCustomers = customers.filter(c => 
    c.contact_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    switch (sortBy) {
      case 'overdue_amount': return b.overdue_amount - a.overdue_amount
      case 'avg_payment_delay': return b.avg_payment_delay - a.avg_payment_delay
      default: return b.risk_score - a.risk_score
    }
  })

  const totalPages = Math.ceil(sortedCustomers.length / itemsPerPage)
  const paginatedCustomers = sortedCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const exportToCSV = () => {
    const csvData = sortedCustomers.map(customer => ({
      'Kunde': customer.contact_name,
      'Risiko Score': customer.risk_score,
      'Antal Fakturaer': customer.invoice_count,
      'Total Beløb': customer.total_amount,
      'Udestående': customer.overdue_amount,
      'Gns. Forsinkelse (dage)': Math.round(customer.avg_payment_delay),
      'Rykkere sendt': customer.reminder_count,
      'Påmindelser sendt': customer.prereminder_count,
      'Sidst Faktura': formatDate(customer.last_invoice_date)
    }))
    const csv = unparse(csvData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.setAttribute('href', URL.createObjectURL(blob))
    link.setAttribute('download', `problemkunder_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('Problemkunder Rapport', 14, 22)
    doc.setFontSize(11)
    doc.text(`Genereret: ${new Date().toLocaleDateString('da-DK')}`, 14, 30)
    doc.setFontSize(10)
    doc.text(`Antal kunder: ${sortedCustomers.length}`, 14, 38)
    doc.text(`Total udestående: ${formatCurrency(dashboardStats.total_outstanding)}`, 14, 44)
    
    const tableData = sortedCustomers.map(customer => [
      customer.contact_name,
      customer.risk_score + '%',
      customer.invoice_count.toString(),
      formatCurrency(customer.overdue_amount),
      `${Math.round(customer.avg_payment_delay)}d`,
      (customer.reminder_count + customer.prereminder_count).toString()
    ])

    autoTable(doc, {
      startY: 52,
      head: [['Kunde', 'Score', 'Fakt.', 'Udestående', 'Forsink.', 'Rykkere']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [124, 58, 237] },
      styles: { fontSize: 8 },
    })
    doc.save(`problemkunder_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const theme = {
    bg: darkMode ? '#0a0a0a' : '#fafafa',
    card: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.9)',
    cardBorder: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    cardHover: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
    sidebarBg: isMobile ? (darkMode ? '#0a0a0a' : '#ffffff') : 'transparent',
    sidebarBorder: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    header: darkMode ? 'rgba(10,10,10,0.95)' : 'rgba(250,250,250,0.95)',
    text: darkMode ? '#fafafa' : '#18181b',
    textSecondary: darkMode ? '#a1a1aa' : '#71717a',
    textMuted: darkMode ? '#52525b' : '#a1a1aa',
    primary: '#7c3aed',
    primaryMuted: darkMode ? 'rgba(124, 58, 237, 0.15)' : 'rgba(124, 58, 237, 0.08)',
    success: '#10b981',
    successBg: darkMode ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)',
    secondary: '#6366f1',
    secondaryBg: darkMode ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.08)',
    info: '#0891b2',
    infoBg: darkMode ? 'rgba(8, 145, 178, 0.12)' : 'rgba(8, 145, 178, 0.08)',
    gridColor: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
  }

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard-v4' },
    { icon: Users, label: 'Kunder', href: '/dashboard-v4/kunder' },
    { icon: AlertCircle, label: 'Problemkunder', href: '/dashboard-v4/problemkunder', active: true },
    { icon: Zap, label: 'Automatik', href: '/dashboard-v4/automatik' },
    { icon: Building2, label: 'Integrationer', href: '/dashboard-v4/integrationer' },
    { icon: Settings, label: 'Indstillinger', href: '/dashboard-v4/indstillinger' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden" style={{ backgroundColor: theme.bg }}>
        <div className="p-4 lg:p-6 animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded-lg mb-6" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-2xl" />)}
          </div>
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded-xl" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen w-full overflow-x-hidden"
      style={{ 
        backgroundColor: theme.bg,
        backgroundImage: `radial-gradient(${theme.gridColor} 1.5px, transparent 1.5px)`,
        backgroundSize: '24px 24px',
      }}
    >
      {sidebarOpen && isMobile && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        style={{ backgroundColor: theme.sidebarBg, borderRight: `1px solid ${theme.sidebarBorder}` }}
      >
        <div className="h-16 flex items-center justify-between px-4" style={{ borderBottom: `1px solid ${theme.sidebarBorder}` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.primary }}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg" style={{ color: theme.text }}>Autorykker</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-lg" style={{ color: theme.textSecondary }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-3 space-y-1">
          {navItems.map((item, i) => (
            <Link key={i} href={item.href} onClick={() => isMobile && setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all" 
              style={{ 
                backgroundColor: item.active ? theme.primaryMuted : 'transparent',
                color: item.active ? theme.primary : theme.textSecondary,
                border: item.active ? `1px solid ${theme.primary}30` : '1px solid transparent',
              }}>
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="flex-1 font-medium text-sm truncate">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4" style={{ borderTop: `1px solid ${theme.sidebarBorder}` }}>
          <div className="p-4 rounded-xl" style={{ border: `1px solid ${theme.primary}30`, backgroundColor: theme.primaryMuted }}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4" style={{ color: theme.primary }} />
              <span className="font-semibold text-sm" style={{ color: theme.text }}>Pro Plan</span>
            </div>
            <p className="text-xs mb-3" style={{ color: theme.textSecondary }}>Få adgang til alle funktioner</p>
            <button className="w-full py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: theme.primary }}>Opgrader</button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        <header className="h-14 lg:h-16 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 backdrop-blur-md" style={{ backgroundColor: theme.header, borderBottom: `1px solid ${theme.sidebarBorder}` }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg" style={{ color: theme.textSecondary }}>
              <Menu className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 lg:gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className="p-1.5 lg:p-2 rounded-xl" style={{ border: `1px solid ${theme.cardBorder}`, color: theme.textSecondary }}>
              {darkMode ? <Sun className="w-4 h-4 lg:w-5 lg:h-5" /> : <Moon className="w-4 h-4 lg:w-5 lg:h-5" />}
            </button>
            <button className="p-1.5 lg:p-2 rounded-xl relative" style={{ border: `1px solid ${theme.cardBorder}`, color: theme.textSecondary }}>
              <Bell className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
            <div className="flex items-center gap-2 ml-2 pl-3" style={{ borderLeft: `1px solid ${theme.cardBorder}` }}>
              <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-xs lg:text-sm font-medium" style={{ backgroundColor: theme.primaryMuted, color: theme.primary }}>AL</div>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-6">
            <div className="flex items-center gap-3">
              <Link href="/dashboard-v4" className="p-2 rounded-lg hover:bg-black/5" style={{ color: theme.textSecondary }}>
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold" style={{ color: theme.text }}>Problemkunder</h1>
                <p className="text-xs lg:text-sm" style={{ color: theme.textSecondary }}>
                  {sortedCustomers.length} kunder sorteret efter {sortBy === 'risk_score' ? 'risiko score' : sortBy === 'overdue_amount' ? 'udestående' : 'forsinkelse'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={exportToCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs lg:text-sm" style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text }}>
                <FileText className="w-3.5 h-3.5" /> CSV
              </button>
              <button onClick={exportToPDF} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs lg:text-sm font-medium text-white" style={{ backgroundColor: theme.primary }}>
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
            <div className="p-4 rounded-2xl" style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl" style={{ backgroundColor: theme.primaryMuted }}>
                  <Users className="w-4 h-4" style={{ color: theme.primary }} />
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: theme.infoBg, color: theme.info }}>
                  Aktive
                </span>
              </div>
              <p className="text-2xl font-bold" style={{ color: theme.text }}>{customers.length}</p>
              <p className="text-xs" style={{ color: theme.textSecondary }}>Problemkunder</p>
            </div>
            
            <div className="p-4 rounded-2xl" style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl" style={{ backgroundColor: theme.secondaryBg }}>
                  <Receipt className="w-4 h-4" style={{ color: theme.secondary }} />
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: theme.text }}>{formatCurrency(dashboardStats.total_outstanding)}</p>
              <p className="text-xs" style={{ color: theme.textSecondary }}>Total udestående</p>
            </div>
            
            <div className="p-4 rounded-2xl" style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl" style={{ backgroundColor: theme.infoBg }}>
                  <Clock className="w-4 h-4" style={{ color: theme.info }} />
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: theme.text }}>{Math.round(dashboardStats.avg_delay)}d</p>
              <p className="text-xs" style={{ color: theme.textSecondary }}>Gns. forsinkelse</p>
            </div>
            
            <div className="p-4 rounded-2xl" style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl" style={{ backgroundColor: theme.successBg }}>
                  <Mail className="w-4 h-4" style={{ color: theme.success }} />
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: theme.text }}>{dashboardStats.total_reminders}</p>
              <p className="text-xs" style={{ color: theme.textSecondary }}>Rykkere sendt</p>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4 lg:mb-6">
            <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ border: `1px solid ${theme.cardBorder}`, backgroundColor: theme.card }}>
              <Search className="w-4 h-4" style={{ color: theme.textMuted }} />
              <input
                type="text"
                placeholder="Søg efter kunde..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none flex-1 text-sm"
                style={{ color: theme.text }}
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
                style={{ border: `1px solid ${theme.cardBorder}`, backgroundColor: theme.card, color: theme.text }}
              >
                <option value="risk_score">Risiko Score</option>
                <option value="overdue_amount">Udestående</option>
                <option value="avg_payment_delay">Forsinkelse</option>
              </select>
            </div>
          </div>

          {/* Customer Table/List */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}` }}>
            {/* Table Header - Desktop */}
            <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3" style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
              <div className="col-span-3 text-xs font-medium uppercase" style={{ color: theme.textSecondary }}>#  Kunde</div>
              <div className="col-span-1 text-xs font-medium uppercase text-center" style={{ color: theme.textSecondary }}>Score</div>
              <div className="col-span-2 text-xs font-medium uppercase text-right" style={{ color: theme.textSecondary }}>Udestående</div>
              <div className="col-span-2 text-xs font-medium uppercase text-right" style={{ color: theme.textSecondary }}>Total</div>
              <div className="col-span-1 text-xs font-medium uppercase text-center" style={{ color: theme.textSecondary }}>Fakt.</div>
              <div className="col-span-1 text-xs font-medium uppercase text-center" style={{ color: theme.textSecondary }}>Forsink.</div>
              <div className="col-span-1 text-xs font-medium uppercase text-center" style={{ color: theme.textSecondary }}>Rykkere</div>
              <div className="col-span-1 text-xs font-medium uppercase text-center" style={{ color: theme.textSecondary }}>Status</div>
            </div>

            {/* Customer Rows */}
            <div className="divide-y" style={{ borderColor: theme.cardBorder }}>
              {paginatedCustomers.map((customer, index) => {
                const statusInfo = getStatusInfo(customer)
                return (
                  <div 
                    key={index} 
                    className="px-4 lg:px-6 py-3 lg:py-4 hover:bg-black/[0.02] transition-colors"
                  >
                    {/* Desktop Row */}
                    <div className="hidden lg:grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-3 flex items-center gap-3">
                        <span className="text-xs font-medium w-6" style={{ color: theme.textMuted }}>{(currentPage - 1) * itemsPerPage + index + 1}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate" style={{ color: theme.text }}>{customer.contact_name}</p>
                          <p className="text-xs truncate" style={{ color: theme.textMuted }}>Sidst: {formatDate(customer.last_invoice_date)}</p>
                        </div>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="text-sm font-bold" style={{ color: customer.risk_score >= 50 ? theme.info : theme.text }}>
                          {customer.risk_score}%
                        </span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-sm font-semibold" style={{ color: theme.text }}>{formatCurrency(customer.overdue_amount)}</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-sm" style={{ color: theme.textSecondary }}>{formatCurrency(customer.total_amount)}</span>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="text-sm" style={{ color: theme.text }}>{customer.invoice_count}</span>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="text-sm font-medium" style={{ color: customer.avg_payment_delay > 14 ? theme.secondary : theme.info }}>
                          {customer.avg_payment_delay > 0 ? Math.round(customer.avg_payment_delay) + 'd' : 'Aldrig'}
                        </span>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="text-sm" style={{ color: theme.text }}>{customer.reminder_count + customer.prereminder_count}</span>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="px-2 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* Mobile Row */}
                    <div className="lg:hidden">
                      <div className="flex items-start gap-3">
                        <span className="text-xs font-medium pt-1 w-5" style={{ color: theme.textMuted }}>{(currentPage - 1) * itemsPerPage + index + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate" style={{ color: theme.text }}>{customer.contact_name}</p>
                              <p className="text-xs" style={{ color: theme.textMuted }}>{customer.invoice_count} fakturaer • {customer.reminder_count + customer.prereminder_count} rykkere</p>
                            </div>
                            <span className="px-2 py-0.5 rounded-lg text-xs font-medium shrink-0" style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                              {customer.risk_score}%
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            <div>
                              <p className="text-sm font-semibold" style={{ color: theme.text }}>{formatCurrency(customer.overdue_amount)}</p>
                              <p className="text-[10px]" style={{ color: theme.textMuted }}>udestående</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium" style={{ color: theme.info }}>{Math.round(customer.avg_payment_delay)}d</p>
                              <p className="text-[10px]" style={{ color: theme.textMuted }}>forsinkelse</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Empty State */}
            {sortedCustomers.length === 0 && (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: theme.successBg }}>
                  <TrendingUp className="w-6 h-6" style={{ color: theme.success }} />
                </div>
                <h3 className="text-lg font-medium mb-2" style={{ color: theme.text }}>Ingen problemkunder fundet</h3>
                <p style={{ color: theme.textSecondary }}>
                  {searchQuery ? 'Prøv at søge efter noget andet' : 'Alle kunder betaler til tiden! 🎉'}
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40"
                style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text }}
              >
                Forrige
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 rounded-lg text-sm font-medium"
                    style={{ 
                      backgroundColor: currentPage === page ? theme.primary : 'transparent',
                      color: currentPage === page ? 'white' : theme.text,
                      border: currentPage === page ? 'none' : `1px solid ${theme.cardBorder}`
                    }}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40"
                style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text }}
              >
                Næste
              </button>
            </div>
          )}

          {/* Footer info */}
          {sortedCustomers.length > 0 && (
            <div className="mt-3 text-center">
              <p className="text-xs" style={{ color: theme.textMuted }}>
                Viser {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, sortedCustomers.length)} af {sortedCustomers.length} kunder • Automatik håndterer rykkere automatisk
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
