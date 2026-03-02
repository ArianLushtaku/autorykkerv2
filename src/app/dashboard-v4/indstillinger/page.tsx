'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Moon, Sun, LayoutDashboard, FileText, Users, Settings, Bell, 
  Search, ChevronDown, AlertTriangle, User, Lock, CreditCard, Globe,
  Zap, Building2, Menu, Receipt, X, Sparkles, ChevronLeft, Save
} from 'lucide-react'

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

export default function IndstillingerV4Page() {
  const isMobile = useIsMobile()
  const [darkMode, setDarkMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('profil')

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
    gridColor: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
  }

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard-v4' },
    { icon: Users, label: 'Kunder', href: '/dashboard-v4/kunder' },
    { icon: AlertTriangle, label: 'Problemkunder', href: '/dashboard-v4/problemkunder' },
    { icon: Zap, label: 'Automatik', href: '/dashboard-v4/automatik' },
    { icon: Building2, label: 'Integrationer', href: '/dashboard-v4/integrationer' },
    { icon: Settings, label: 'Indstillinger', href: '/dashboard-v4/indstillinger', active: true },
  ]

  const settingsSections = [
    { id: 'profil', label: 'Profil', icon: User },
    { id: 'sikkerhed', label: 'Sikkerhed', icon: Lock },
    { id: 'abonnement', label: 'Abonnement', icon: CreditCard },
    { id: 'sprog', label: 'Sprog & Region', icon: Globe },
  ]

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
          <div className="flex items-center gap-3 mb-4 lg:mb-6">
            <Link href="/dashboard-v4" className="p-2 rounded-lg hover:bg-black/5" style={{ color: theme.textSecondary }}>
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold" style={{ color: theme.text }}>Indstillinger</h1>
              <p className="text-xs lg:text-sm" style={{ color: theme.textSecondary }}>Administrer din konto og præferencer</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
            {/* Settings Navigation */}
            <div className="lg:col-span-1">
              <div className="p-2 rounded-2xl" style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}` }}>
                {settingsSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                    style={{ 
                      backgroundColor: activeSection === section.id ? theme.primaryMuted : 'transparent',
                      color: activeSection === section.id ? theme.primary : theme.textSecondary,
                    }}
                  >
                    <section.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{section.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Settings Content */}
            <div className="lg:col-span-3">
              <div className="p-4 lg:p-6 rounded-2xl" style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}` }}>
                {activeSection === 'profil' && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold" style={{ color: theme.text }}>Profil indstillinger</h2>
                    
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold" style={{ backgroundColor: theme.primaryMuted, color: theme.primary }}>
                        AL
                      </div>
                      <button className="px-4 py-2 rounded-xl text-sm font-medium" style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text }}>
                        Skift billede
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>Fornavn</label>
                        <input type="text" defaultValue="Arian" className="w-full px-4 py-2.5 rounded-xl outline-none" style={{ border: `1px solid ${theme.cardBorder}`, backgroundColor: theme.bg, color: theme.text }} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>Efternavn</label>
                        <input type="text" defaultValue="Lushtaku" className="w-full px-4 py-2.5 rounded-xl outline-none" style={{ border: `1px solid ${theme.cardBorder}`, backgroundColor: theme.bg, color: theme.text }} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>Email</label>
                        <input type="email" defaultValue="arian@example.com" className="w-full px-4 py-2.5 rounded-xl outline-none" style={{ border: `1px solid ${theme.cardBorder}`, backgroundColor: theme.bg, color: theme.text }} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>Virksomhed</label>
                        <input type="text" defaultValue="Autorykker ApS" className="w-full px-4 py-2.5 rounded-xl outline-none" style={{ border: `1px solid ${theme.cardBorder}`, backgroundColor: theme.bg, color: theme.text }} />
                      </div>
                    </div>

                    <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: theme.primary }}>
                      <Save className="w-4 h-4" /> Gem ændringer
                    </button>
                  </div>
                )}

                {activeSection === 'sikkerhed' && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold" style={{ color: theme.text }}>Sikkerhed</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>Nuværende adgangskode</label>
                        <input type="password" className="w-full px-4 py-2.5 rounded-xl outline-none" style={{ border: `1px solid ${theme.cardBorder}`, backgroundColor: theme.bg, color: theme.text }} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>Ny adgangskode</label>
                        <input type="password" className="w-full px-4 py-2.5 rounded-xl outline-none" style={{ border: `1px solid ${theme.cardBorder}`, backgroundColor: theme.bg, color: theme.text }} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>Bekræft ny adgangskode</label>
                        <input type="password" className="w-full px-4 py-2.5 rounded-xl outline-none" style={{ border: `1px solid ${theme.cardBorder}`, backgroundColor: theme.bg, color: theme.text }} />
                      </div>
                    </div>

                    <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: theme.primary }}>
                      <Lock className="w-4 h-4" /> Opdater adgangskode
                    </button>
                  </div>
                )}

                {activeSection === 'abonnement' && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold" style={{ color: theme.text }}>Abonnement</h2>
                    
                    <div className="p-4 rounded-xl" style={{ border: `1px solid ${theme.primary}30`, backgroundColor: theme.primaryMuted }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold" style={{ color: theme.text }}>Pro Plan</span>
                        <span className="px-2 py-1 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: theme.primary }}>Aktiv</span>
                      </div>
                      <p className="text-sm mb-4" style={{ color: theme.textSecondary }}>Fuld adgang til alle funktioner</p>
                      <div className="text-2xl font-bold" style={{ color: theme.text }}>299 kr<span className="text-sm font-normal" style={{ color: theme.textSecondary }}>/måned</span></div>
                    </div>

                    <button className="px-6 py-2.5 rounded-xl text-sm font-medium" style={{ border: `1px solid ${theme.cardBorder}`, color: theme.textSecondary }}>
                      Administrer abonnement
                    </button>
                  </div>
                )}

                {activeSection === 'sprog' && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold" style={{ color: theme.text }}>Sprog & Region</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>Sprog</label>
                        <select className="w-full px-4 py-2.5 rounded-xl outline-none" style={{ border: `1px solid ${theme.cardBorder}`, backgroundColor: theme.bg, color: theme.text }}>
                          <option value="da">Dansk</option>
                          <option value="en">English</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>Tidszone</label>
                        <select className="w-full px-4 py-2.5 rounded-xl outline-none" style={{ border: `1px solid ${theme.cardBorder}`, backgroundColor: theme.bg, color: theme.text }}>
                          <option value="Europe/Copenhagen">Europe/Copenhagen (CET)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>Valuta</label>
                        <select className="w-full px-4 py-2.5 rounded-xl outline-none" style={{ border: `1px solid ${theme.cardBorder}`, backgroundColor: theme.bg, color: theme.text }}>
                          <option value="DKK">DKK - Danske Kroner</option>
                          <option value="EUR">EUR - Euro</option>
                        </select>
                      </div>
                    </div>

                    <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: theme.primary }}>
                      <Save className="w-4 h-4" /> Gem ændringer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
