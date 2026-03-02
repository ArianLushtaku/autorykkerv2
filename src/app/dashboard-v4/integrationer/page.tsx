'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { apiClient } from '@/lib/api-client'
import { 
  Moon, Sun, LayoutDashboard, FileText, Users, Settings, Bell, 
  Search, ChevronDown, AlertTriangle, RefreshCw, CheckCircle, Link as LinkIcon, Unlink,
  Zap, Building2, Menu, Receipt, X, Sparkles, ChevronLeft, Landmark, CreditCard
} from 'lucide-react'

interface BankConnection {
  id: string
  bank_name: string
  account_number: string
  is_connected: boolean
  last_sync: string | null
  sync_status: 'success' | 'error' | 'pending'
}

interface Institution {
  id: string
  name: string
  logo: string
  bic: string
  countries: string[]
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

export default function IntegrationerV4Page() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const isMobile = useIsMobile()
  const [darkMode, setDarkMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'bank' | 'regnskab'>('bank')
  
  const [connections, setConnections] = useState<BankConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [showBankSelector, setShowBankSelector] = useState(false)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loadingInstitutions, setLoadingInstitutions] = useState(false)
  const [bankSearchQuery, setBankSearchQuery] = useState('')
  
  const [dineroConnected, setDineroConnected] = useState(false)
  const [syncingDinero, setSyncingDinero] = useState(false)

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'regnskab' || tab === 'bank') setActiveTab(tab)
    
    const success = searchParams.get('success')
    if (success === 'dinero_connected') {
      setActiveTab('regnskab')
      fetchData()
    }
  }, [searchParams])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { connections: bankConnections } = await apiClient.getBankConnections()
      
      if (bankConnections && bankConnections.length > 0) {
        const formattedConnections: BankConnection[] = bankConnections.map((conn: any) => ({
          id: conn.id,
          bank_name: conn.institution_name || conn.institution_id || 'Bank',
          account_number: conn.account_ids?.[0]?.substring(0, 8) + '****' || '****',
          is_connected: conn.status === 'active',
          last_sync: conn.last_sync_at || conn.connected_at,
          sync_status: 'success' as const,
        }))
        setConnections(formattedConnections)
      }

      try {
        const authResult = await apiClient.checkAuthAndSubscription()
        if (authResult.authenticated && authResult.user.is_dinero_connected) {
          setDineroConnected(true)
        }
      } catch (e) {
        console.error('Error checking Dinero status:', e)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async (connectionId: string) => {
    setSyncing(true)
    try {
      const result = await apiClient.syncGoCardlessTransactions()
      setConnections(prev => prev.map(conn => 
        conn.id === connectionId 
          ? { ...conn, last_sync: new Date().toISOString(), sync_status: 'success' as const }
          : conn
      ))
      
      if (result.total_new > 0) {
        alert(`Synkroniseret! ${result.total_new} nye transaktioner fundet.`)
      } else {
        alert('Synkronisering fuldført. Ingen nye transaktioner.')
      }
    } catch (error) {
      console.error('Error syncing:', error)
      alert('Kunne ikke synkronisere. Prøv igen.')
    } finally {
      setSyncing(false)
    }
  }

  const fetchInstitutions = async () => {
    setLoadingInstitutions(true)
    try {
      const data = await apiClient.getInstitutions('DK')
      setInstitutions(data)
    } catch (error) {
      console.error('Error fetching institutions:', error)
      alert('Kunne ikke hente bankliste.')
    } finally {
      setLoadingInstitutions(false)
    }
  }

  const handleConnect = async () => {
    setShowBankSelector(true)
    await fetchInstitutions()
  }

  const handleBankSelect = async (institutionId: string) => {
    try {
      setShowBankSelector(false)
      const reference = `user_${Date.now()}`
      const response = await apiClient.createGoCardlessAuthLink(institutionId, reference)
      if (response.link) {
        window.location.href = response.link
      }
    } catch (error) {
      console.error('Error creating auth link:', error)
      alert('Kunne ikke oprette bankforbindelse.')
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Er du sikker på at du vil afbryde forbindelsen?')) return
    try {
      await apiClient.disconnectGoCardless()
      setConnections([])
      alert('Bankforbindelse afbrudt')
    } catch (error) {
      console.error('Error disconnecting:', error)
      alert('Kunne ikke afbryde forbindelsen.')
    }
  }

  const handleDineroConnect = async () => {
    try {
      const { auth_url } = await apiClient.startDineroAuth()
      window.location.href = auth_url
    } catch (error) {
      console.error('Error starting Dinero auth:', error)
      alert('Kunne ikke starte Dinero forbindelse.')
    }
  }

  const handleDineroSync = async () => {
    setSyncingDinero(true)
    try {
      const result = await apiClient.syncDineroInvoices({ fullSync: false, includeReminders: false })
      alert(result.message || 'Fakturaer synkroniseret!')
    } catch (error) {
      console.error('Error syncing Dinero:', error)
      alert('Kunne ikke synkronisere.')
    } finally {
      setSyncingDinero(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Aldrig'
    return new Date(dateString).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const filteredInstitutions = institutions.filter(inst => 
    inst.name.toLowerCase().includes(bankSearchQuery.toLowerCase())
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
    danger: '#f43f5e',
    dangerBg: darkMode ? 'rgba(244, 63, 94, 0.12)' : 'rgba(244, 63, 94, 0.08)',
    gridColor: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
  }

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard-v4' },
    { icon: Users, label: 'Kunder', href: '/dashboard-v4/kunder' },
    { icon: AlertTriangle, label: 'Problemkunder', href: '/dashboard-v4/problemkunder' },
    { icon: Zap, label: 'Automatik', href: '/dashboard-v4/automatik' },
    { icon: Building2, label: 'Integrationer', href: '/dashboard-v4/integrationer', active: true },
    { icon: Settings, label: 'Indstillinger', href: '/dashboard-v4/indstillinger' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden" style={{ backgroundColor: theme.bg }}>
        <div className="p-4 lg:p-6 animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded-lg mb-6" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
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

      {/* Bank Selector Modal */}
      {showBankSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl p-6 max-h-[80vh] overflow-y-auto" style={{ backgroundColor: darkMode ? '#1a1a1a' : '#ffffff' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: theme.text }}>Vælg din bank</h3>
              <button onClick={() => setShowBankSelector(false)} className="p-2 rounded-lg" style={{ color: theme.textSecondary }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Søg efter bank..."
              value={bankSearchQuery}
              onChange={(e) => setBankSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-xl mb-4 outline-none"
              style={{ border: `1px solid ${theme.cardBorder}`, backgroundColor: theme.bg, color: theme.text }}
            />
            {loadingInstitutions ? (
              <div className="text-center py-8" style={{ color: theme.textSecondary }}>Henter banker...</div>
            ) : (
              <div className="space-y-2">
                {filteredInstitutions.map((inst) => (
                  <button
                    key={inst.id}
                    onClick={() => handleBankSelect(inst.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left"
                    style={{ border: `1px solid ${theme.cardBorder}` }}
                  >
                    {inst.logo && <img src={inst.logo} alt={inst.name} className="w-8 h-8 rounded" />}
                    <span className="font-medium text-sm" style={{ color: theme.text }}>{inst.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
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
          <div className="flex items-center gap-3 mb-4 lg:mb-6">
            <Link href="/dashboard-v4" className="p-2 rounded-lg hover:bg-black/5" style={{ color: theme.textSecondary }}>
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold" style={{ color: theme.text }}>Integrationer</h1>
              <p className="text-xs lg:text-sm" style={{ color: theme.textSecondary }}>Forbind din bank og regnskabssystem</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 lg:mb-6">
            <button
              onClick={() => setActiveTab('bank')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ 
                backgroundColor: activeTab === 'bank' ? theme.primary : 'transparent',
                color: activeTab === 'bank' ? 'white' : theme.textSecondary,
                border: `1px solid ${activeTab === 'bank' ? theme.primary : theme.cardBorder}`,
              }}
            >
              <Landmark className="w-4 h-4" /> Bank
            </button>
            <button
              onClick={() => setActiveTab('regnskab')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ 
                backgroundColor: activeTab === 'regnskab' ? theme.primary : 'transparent',
                color: activeTab === 'regnskab' ? 'white' : theme.textSecondary,
                border: `1px solid ${activeTab === 'regnskab' ? theme.primary : theme.cardBorder}`,
              }}
            >
              <CreditCard className="w-4 h-4" /> Regnskab
            </button>
          </div>

          {/* Bank Tab */}
          {activeTab === 'bank' && (
            <div className="space-y-4">
              {connections.length > 0 ? (
                connections.map((conn) => (
                  <div key={conn.id} className="p-4 lg:p-6 rounded-2xl" style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}` }}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl" style={{ backgroundColor: theme.successBg }}>
                          <Landmark className="w-6 h-6" style={{ color: theme.success }} />
                        </div>
                        <div>
                          <h3 className="font-semibold" style={{ color: theme.text }}>{conn.bank_name}</h3>
                          <p className="text-sm" style={{ color: theme.textSecondary }}>Konto: {conn.account_number}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <CheckCircle className="w-4 h-4" style={{ color: theme.success }} />
                            <span className="text-xs" style={{ color: theme.success }}>Forbundet</span>
                            <span className="text-xs" style={{ color: theme.textMuted }}>• Sidst synk: {formatDate(conn.last_sync)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSync(conn.id)}
                          disabled={syncing}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
                          style={{ backgroundColor: theme.primary }}
                        >
                          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                          {syncing ? 'Synkroniserer...' : 'Synkroniser'}
                        </button>
                        <button
                          onClick={handleDisconnect}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
                          style={{ border: `1px solid ${theme.cardBorder}`, color: theme.danger }}
                        >
                          <Unlink className="w-4 h-4" />
                          <span className="hidden sm:inline">Afbryd</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 lg:p-12 rounded-2xl text-center" style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}` }}>
                  <Landmark className="w-12 h-12 mx-auto mb-4" style={{ color: theme.textMuted }} />
                  <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>Ingen bank forbundet</h3>
                  <p className="text-sm mb-6" style={{ color: theme.textSecondary }}>Forbind din bank for automatisk at matche betalinger med fakturaer</p>
                  <button
                    onClick={handleConnect}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-white mx-auto"
                    style={{ backgroundColor: theme.primary }}
                  >
                    <LinkIcon className="w-4 h-4" />
                    Forbind bank
                  </button>
                </div>
              )}

              {connections.length > 0 && (
                <button
                  onClick={handleConnect}
                  className="w-full p-4 rounded-2xl text-sm font-medium flex items-center justify-center gap-2"
                  style={{ border: `2px dashed ${theme.cardBorder}`, color: theme.textSecondary }}
                >
                  <LinkIcon className="w-4 h-4" />
                  Tilføj en anden bank
                </button>
              )}
            </div>
          )}

          {/* Regnskab Tab */}
          {activeTab === 'regnskab' && (
            <div className="space-y-4">
              <div className="p-4 lg:p-6 rounded-2xl" style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}` }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: dineroConnected ? theme.successBg : theme.primaryMuted }}>
                      <CreditCard className="w-6 h-6" style={{ color: dineroConnected ? theme.success : theme.primary }} />
                    </div>
                    <div>
                      <h3 className="font-semibold" style={{ color: theme.text }}>Dinero</h3>
                      <p className="text-sm" style={{ color: theme.textSecondary }}>Regnskabssystem</p>
                      {dineroConnected && (
                        <div className="flex items-center gap-2 mt-1">
                          <CheckCircle className="w-4 h-4" style={{ color: theme.success }} />
                          <span className="text-xs" style={{ color: theme.success }}>Forbundet</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {dineroConnected ? (
                    <button
                      onClick={handleDineroSync}
                      disabled={syncingDinero}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
                      style={{ backgroundColor: theme.primary }}
                    >
                      <RefreshCw className={`w-4 h-4 ${syncingDinero ? 'animate-spin' : ''}`} />
                      {syncingDinero ? 'Synkroniserer...' : 'Synkroniser fakturaer'}
                    </button>
                  ) : (
                    <button
                      onClick={handleDineroConnect}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
                      style={{ backgroundColor: theme.primary }}
                    >
                      <LinkIcon className="w-4 h-4" />
                      Forbind Dinero
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
