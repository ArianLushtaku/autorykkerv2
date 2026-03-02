'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { 
  Moon, Sun, LayoutDashboard, FileText, Users, Settings, Bell, 
  AlertTriangle, Clock, Mail, CheckCircle,
  Zap, Building2, Menu, Receipt, X, Sparkles, ChevronLeft, Search
} from 'lucide-react'

interface OverdueInvoice {
  id: string
  invoice_number: string
  contact_name: string
  total_incl_vat: number
  payment_date: string
  days_overdue: number
  latest_mail_out_type: string
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

export default function ForfaldneV4Page() {
  const isMobile = useIsMobile()
  const [darkMode, setDarkMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [invoices, setInvoices] = useState<OverdueInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchOverdueInvoices()
  }, [])

  const fetchOverdueInvoices = async () => {
    try {
      const data = await apiClient.getOverdueInvoices(100)
      setInvoices(data.invoices || [])
    } catch (error) {
      console.error('Error fetching overdue invoices:', error)
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

  const filteredInvoices = invoices.filter(inv => 
    inv.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.invoice_number?.toString().includes(searchQuery)
  )

  const theme = {
    bg: darkMode ? '#0a0a0a' : '#fafafa',
    card: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
    cardBorder: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
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
    warning: '#f59e0b',
    warningBg: darkMode ? 'rgba(245, 158, 11, 0.10)' : 'rgba(245, 158, 11, 0.06)',
    danger: '#f43f5e',
    dangerBg: darkMode ? 'rgba(244, 63, 94, 0.12)' : 'rgba(244, 63, 94, 0.08)',
    gridColor: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
  }

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard-v4' },
    { icon: Users, label: 'Kunder', href: '/dashboard-v4/kunder' },
    { icon: AlertTriangle, label: 'Problemkunder', href: '/dashboard-v4/problemkunder' },
    { icon: Zap, label: 'Automatik', href: '/dashboard-v4/automatik' },
    { icon: Building2, label: 'Integrationer', href: '/dashboard-v4/integrationer' },
    { icon: Settings, label: 'Indstillinger', href: '/dashboard-v4/indstillinger' },
  ]

  const getStatusColor = (daysOverdue: number) => {
    if (daysOverdue > 30) return { bg: theme.dangerBg, color: theme.danger }
    if (daysOverdue > 14) return { bg: theme.warningBg, color: theme.warning }
    return { bg: theme.primaryMuted, color: theme.primary }
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden" style={{ backgroundColor: theme.bg }}>
        <div className="p-4 lg:p-6 animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded-lg mb-6" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-2xl" />
            ))}
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
                backgroundColor: 'transparent',
                color: theme.textSecondary,
                border: '1px solid transparent',
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
                <h1 className="text-xl lg:text-2xl font-bold" style={{ color: theme.text }}>Forfaldne Fakturaer</h1>
                <p className="text-xs lg:text-sm" style={{ color: theme.textSecondary }}>{filteredInvoices.length} fakturaer • Automatik håndterer rykkere</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4 lg:mb-6">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ border: `1px solid ${theme.cardBorder}`, backgroundColor: theme.card }}>
              <Search className="w-4 h-4" style={{ color: theme.textMuted }} />
              <input
                type="text"
                placeholder="Søg efter kunde eller fakturanummer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none flex-1 text-sm"
                style={{ color: theme.text }}
              />
            </div>
          </div>

          {/* Invoice List */}
          {isMobile ? (
            <div className="space-y-3">
              {filteredInvoices.map((invoice) => {
                const statusStyle = getStatusColor(invoice.days_overdue)
                return (
                  <div key={invoice.id} className="p-4 rounded-2xl" style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}` }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate" style={{ color: theme.text }}>{invoice.contact_name}</p>
                        <p className="text-xs" style={{ color: theme.textSecondary }}>#{invoice.invoice_number}</p>
                      </div>
                      <span className="px-2 py-1 rounded-lg text-xs font-bold shrink-0" style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>
                        {invoice.days_overdue}d
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold" style={{ color: theme.text }}>{formatCurrency(invoice.total_incl_vat)}</p>
                        <p className="text-xs" style={{ color: theme.textMuted }}>Forfald: {formatDate(invoice.payment_date)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ backgroundColor: theme.infoBg }}>
                        <Clock className="w-3 h-3" style={{ color: theme.info }} />
                        <span className="text-xs font-medium" style={{ color: theme.info }}>Automatisk</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}` }}>
              <table className="w-full">
                <thead style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: theme.textSecondary }}>Faktura</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: theme.textSecondary }}>Kunde</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase" style={{ color: theme.textSecondary }}>Beløb</th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase" style={{ color: theme.textSecondary }}>Forfald</th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase" style={{ color: theme.textSecondary }}>Dage</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase" style={{ color: theme.textSecondary }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice, index) => {
                    const statusStyle = getStatusColor(invoice.days_overdue)
                    return (
                      <tr key={invoice.id} style={{ borderBottom: index < filteredInvoices.length - 1 ? `1px solid ${theme.cardBorder}` : 'none' }}>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium" style={{ color: theme.text }}>#{invoice.invoice_number}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm" style={{ color: theme.text }}>{invoice.contact_name}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-bold" style={{ color: theme.text }}>{formatCurrency(invoice.total_incl_vat)}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm" style={{ color: theme.textSecondary }}>{formatDate(invoice.payment_date)}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>
                            {invoice.days_overdue} dage
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg ml-auto w-fit" style={{ backgroundColor: theme.infoBg }}>
                            <Clock className="w-3 h-3" style={{ color: theme.info }} />
                            <span className="text-xs font-medium" style={{ color: theme.info }}>Automatisk</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredInvoices.length === 0 && (
            <div className="text-center py-12 rounded-2xl" style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}` }}>
              <CheckCircle className="h-12 w-12 mx-auto mb-4" style={{ color: theme.success }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: theme.text }}>Ingen forfaldne fakturaer</h3>
              <p style={{ color: theme.textSecondary }}>Alle fakturaer er betalt til tiden! 🎉</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
