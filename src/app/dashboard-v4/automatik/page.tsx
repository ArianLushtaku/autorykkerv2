'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Moon, Sun, LayoutDashboard, FileText, Users, Settings, Bell, 
  AlertTriangle, Play, Pause, Clock, Mail, CheckCircle,
  Zap, Building2, Menu, Receipt, X, Sparkles, ChevronLeft, Calendar
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

export default function AutomatikV4Page() {
  const isMobile = useIsMobile()
  const [darkMode, setDarkMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  const [automationEnabled, setAutomationEnabled] = useState(true)
  const [reminderSettings, setReminderSettings] = useState({
    preReminder: { enabled: true, days: 3 },
    reminder1: { enabled: true, days: 10 },
    reminder2: { enabled: true, days: 10 },
    reminder3: { enabled: true, days: 10 },
  })

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
    { icon: Zap, label: 'Automatik', href: '/dashboard-v4/automatik', active: true },
    { icon: Building2, label: 'Integrationer', href: '/dashboard-v4/integrationer' },
    { icon: Settings, label: 'Indstillinger', href: '/dashboard-v4/indstillinger' },
  ]

  const reminderSteps = [
    { key: 'preReminder', label: 'Påmindelse', description: 'Venlig påmindelse før forfald', icon: Mail, color: theme.primary },
    { key: 'reminder1', label: 'Rykker 1', description: 'Første rykker efter forfald', icon: Clock, color: theme.warning },
    { key: 'reminder2', label: 'Rykker 2', description: 'Anden rykker', icon: AlertTriangle, color: theme.warning },
    { key: 'reminder3', label: 'Rykker 3', description: 'Sidste rykker før inkasso', icon: AlertTriangle, color: theme.danger },
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
              <h1 className="text-xl lg:text-2xl font-bold" style={{ color: theme.text }}>Rykkerautomatik</h1>
              <p className="text-xs lg:text-sm" style={{ color: theme.textSecondary }}>Automatiser dine betalingspåmindelser</p>
            </div>
          </div>

          {/* Main Toggle */}
          <div className="p-4 lg:p-6 rounded-2xl mb-4 lg:mb-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}` }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: automationEnabled ? theme.successBg : theme.dangerBg }}>
                  {automationEnabled ? <Play className="w-6 h-6" style={{ color: theme.success }} /> : <Pause className="w-6 h-6" style={{ color: theme.danger }} />}
                </div>
                <div>
                  <h2 className="font-semibold" style={{ color: theme.text }}>Automatisk rykkersystem</h2>
                  <p className="text-sm" style={{ color: theme.textSecondary }}>
                    {automationEnabled ? 'Systemet sender automatisk rykkere' : 'Automatik er sat på pause'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAutomationEnabled(!automationEnabled)}
                className="px-6 py-2.5 rounded-xl text-sm font-medium text-white"
                style={{ backgroundColor: automationEnabled ? theme.danger : theme.success }}
              >
                {automationEnabled ? 'Sæt på pause' : 'Aktiver'}
              </button>
            </div>
          </div>

          {/* Reminder Flow */}
          <div className="p-4 lg:p-6 rounded-2xl mb-4 lg:mb-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}` }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: theme.text }}>Rykkerflow</h2>
            <p className="text-sm mb-6" style={{ color: theme.textSecondary }}>
              Konfigurer hvornår og hvordan rykkere sendes automatisk
            </p>

            <div className="space-y-4">
              {reminderSteps.map((step, index) => {
                const setting = reminderSettings[step.key as keyof typeof reminderSettings]
                return (
                  <div key={step.key} className="relative">
                    {index < reminderSteps.length - 1 && (
                      <div className="absolute left-6 top-16 w-0.5 h-8 lg:h-12" style={{ backgroundColor: theme.cardBorder }} />
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl" style={{ border: `1px solid ${theme.cardBorder}` }}>
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-2.5 rounded-xl shrink-0" style={{ backgroundColor: `${step.color}15` }}>
                          <step.icon className="w-5 h-5" style={{ color: step.color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium" style={{ color: theme.text }}>{step.label}</h3>
                          <p className="text-xs lg:text-sm truncate" style={{ color: theme.textSecondary }}>{step.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" style={{ color: theme.textMuted }} />
                          <input
                            type="number"
                            value={setting.days}
                            onChange={(e) => setReminderSettings(prev => ({
                              ...prev,
                              [step.key]: { ...prev[step.key as keyof typeof prev], days: parseInt(e.target.value) || 0 }
                            }))}
                            className="w-16 px-2 py-1.5 rounded-lg text-sm text-center outline-none"
                            style={{ border: `1px solid ${theme.cardBorder}`, backgroundColor: theme.bg, color: theme.text }}
                          />
                          <span className="text-sm" style={{ color: theme.textSecondary }}>dage</span>
                        </div>
                        <button
                          onClick={() => setReminderSettings(prev => ({
                            ...prev,
                            [step.key]: { ...prev[step.key as keyof typeof prev], enabled: !setting.enabled }
                          }))}
                          className="p-2 rounded-lg"
                          style={{ 
                            backgroundColor: setting.enabled ? theme.successBg : theme.cardBorder,
                            color: setting.enabled ? theme.success : theme.textMuted
                          }}
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 lg:p-6 rounded-2xl" style={{ backgroundColor: theme.primaryMuted, border: `1px solid ${theme.primary}30` }}>
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 shrink-0 mt-0.5" style={{ color: theme.primary }} />
              <div>
                <h3 className="font-semibold mb-1" style={{ color: theme.text }}>Sådan fungerer det</h3>
                <p className="text-sm" style={{ color: theme.textSecondary }}>
                  Når en faktura forfalder, starter systemet automatisk rykkerflowet. Først sendes en venlig påmindelse, 
                  efterfulgt af op til 3 rykkere med stigende alvor. Efter den sidste rykker kan fakturaen sendes til inkasso.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
