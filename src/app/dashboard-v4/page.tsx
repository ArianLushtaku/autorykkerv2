'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { 
  Moon, Sun, LayoutDashboard, FileText, Users, Settings, Bell, 
  Search, ChevronDown, ArrowUpRight, ArrowDownRight,
  Zap, Calendar, Download, GripVertical, Plus, X, Pencil, Check,
  Clock, AlertCircle, CheckCircle2, Timer, ChevronRight,
  Building2, Menu, Receipt, CircleDollarSign, Send, Eye, Sparkles,
  BarChart3, PieChart, RotateCcw, Maximize2, Minimize2
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Invoice, ProblemCustomer, PaymentStats } from '@/types/database'

// Widget types
type WidgetType = 'stat-revenue' | 'stat-invoices' | 'stat-payment' | 'stat-overdue' | 
                  'chart-revenue' | 'chart-behavior' | 'actions' | 'customers' | 'automation-status' | 'recent-activity'

interface Widget {
  id: string
  type: WidgetType
  size: 'small' | 'medium' | 'large' | 'full'
}

// Sortable Widget Wrapper
function SortableWidget({ 
  id, 
  children, 
  isCustomizing,
  onResize,
  canExpand,
  canShrink,
}: { 
  id: string
  children: React.ReactNode
  isCustomizing: boolean
  onResize?: (direction: 'expand' | 'shrink') => void
  canExpand?: boolean
  canShrink?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isCustomizing })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group h-full">
      {isCustomizing && (
        <>
          <div 
            {...attributes} 
            {...listeners}
            className="absolute top-2 left-2 p-1.5 rounded-lg cursor-grab active:cursor-grabbing z-20 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: '#7c3aed' }}
          >
            <GripVertical className="w-4 h-4 text-white" />
          </div>
          <div className="absolute top-2 left-12 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
            {canShrink && (
              <button
                onClick={() => onResize?.('shrink')}
                className="p-1.5 rounded-lg"
                style={{ backgroundColor: '#7c3aed' }}
                title="Smallere"
              >
                <Minimize2 className="w-3 h-3 text-white" />
              </button>
            )}
            {canExpand && (
              <button
                onClick={() => onResize?.('expand')}
                className="p-1.5 rounded-lg"
                style={{ backgroundColor: '#7c3aed' }}
                title="Bredere"
              >
                <Maximize2 className="w-3 h-3 text-white" />
              </button>
            )}
          </div>
        </>
      )}
      {children}
    </div>
  )
}

// Hook to detect mobile
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

export default function DashboardV4Page() {
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const [darkMode, setDarkMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  
  // Real data state
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [problemCustomers, setProblemCustomers] = useState<ProblemCustomer[]>([])
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([])
  const [customerBehavior, setCustomerBehavior] = useState({ excellent: 0, good: 0, slow: 0, problem: 0 })
  const [loading, setLoading] = useState(true)

  // Default layout
  const defaultLayout: Widget[] = [
    { id: 'w1', type: 'stat-revenue', size: 'small' },
    { id: 'w2', type: 'stat-invoices', size: 'small' },
    { id: 'w3', type: 'stat-payment', size: 'small' },
    { id: 'w4', type: 'stat-overdue', size: 'small' },
    { id: 'w5', type: 'chart-revenue', size: 'large' },
    { id: 'w6', type: 'chart-behavior', size: 'large' },
    { id: 'w7', type: 'actions', size: 'small' },
    { id: 'w8', type: 'customers', size: 'medium' },
    { id: 'w9', type: 'automation-status', size: 'medium' },
    { id: 'w10', type: 'recent-activity', size: 'large' },
  ]

  const [widgets, setWidgets] = useState<Widget[]>(defaultLayout)

  const allWidgets: { type: WidgetType; label: string; icon: any }[] = [
    { type: 'stat-revenue', label: 'Omsætning', icon: CircleDollarSign },
    { type: 'stat-invoices', label: 'Fakturaer', icon: Receipt },
    { type: 'stat-payment', label: 'Betalingstid', icon: Timer },
    { type: 'stat-overdue', label: 'Forfaldne', icon: AlertCircle },
    { type: 'chart-revenue', label: 'Omsætningsgraf', icon: BarChart3 },
    { type: 'chart-behavior', label: 'Kundeadfærd', icon: PieChart },
    { type: 'actions', label: 'Hurtige handlinger', icon: Zap },
    { type: 'customers', label: 'Kunder der kræver opmærksomhed', icon: Users },
    { type: 'automation-status', label: 'Automatik Status', icon: Zap },
    { type: 'recent-activity', label: 'Seneste Aktivitet', icon: Clock },
  ]
  
  const usedTypes = new Set(widgets.map(w => w.type))
  const availableWidgets = allWidgets.filter(w => !usedTypes.has(w.type))

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Fetch real data
  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    if (sidebarOpen && isMobile) {
      const handleClick = (e: MouseEvent) => {
        const sidebar = document.getElementById('sidebar')
        if (sidebar && !sidebar.contains(e.target as Node)) {
          setSidebarOpen(false)
        }
      }
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [sidebarOpen, isMobile])

  const fetchDashboardData = async () => {
    try {
      const [statsData, topProblemCustomersData, allProblemCustomersData, customerBehaviorData, recentInvoicesData] = await Promise.all([
        apiClient.getDashboardStats(),
        apiClient.getProblemCustomers(5, 0),
        apiClient.getProblemCustomers(1000, 0),
        apiClient.getCustomerBehavior(),
        apiClient.getRecentInvoices(5)
      ])

      setStats({
        total_invoices: statsData.total_invoices,
        total_revenue: statsData.total_revenue,
        average_invoice_value: statsData.average_invoice_value,
        average_payment_delay: statsData.average_payment_delay,
        overdue_count: statsData.overdue_count,
        pending_count: statsData.pending_count,
        paid_count: statsData.paid_count
      })

      setCustomerBehavior({
        ...customerBehaviorData.summary,
        problem: allProblemCustomersData.customers.length
      })

      const recentInvoicesList = recentInvoicesData.invoices.map((invoice: any) => ({
        ...invoice,
        invoice_number: invoice.invoice_number,
        customer_name: invoice.contact_name,
        amount: parseFloat(invoice.total_incl_vat) || 0
      }))
      setRecentInvoices(recentInvoicesList as any)
      setProblemCustomers(topProblemCustomersData.customers)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 }).format(amount) + ' kr'
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex(w => w.id === active.id)
        const newIndex = items.findIndex(w => w.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  function addWidget(type: WidgetType) {
    let size: Widget['size'] = 'small'
    if (type.startsWith('chart-') || type === 'customers' || type === 'recent-activity') {
      size = 'large'
    } else if (type === 'automation-status') {
      size = 'medium'
    }
    const newWidget: Widget = { id: `w${Date.now()}`, type, size }
    setWidgets([...widgets, newWidget])
  }

  function removeWidget(id: string) {
    setWidgets(widgets.filter(w => w.id !== id))
  }

  function resizeWidget(id: string, direction: 'expand' | 'shrink') {
    setWidgets(widgets.map(w => {
      if (w.id !== id) return w
      const sizes: Widget['size'][] = ['small', 'medium', 'large', 'full']
      const currentIndex = sizes.indexOf(w.size)
      const newIndex = direction === 'expand' 
        ? Math.min(currentIndex + 1, sizes.length - 1)
        : Math.max(currentIndex - 1, 0)
      return { ...w, size: sizes[newIndex] }
    }))
  }

  function resetToDefaultLayout() {
    setWidgets(defaultLayout.map((w, i) => ({ ...w, id: `w${Date.now()}-${i}` })))
  }

  // Theme
  const theme = {
    bg: darkMode ? '#0a0a0a' : '#fafafa',
    card: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
    cardBorder: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    cardHover: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    
    // Mobile sidebar is solid, desktop is transparent
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
    info: '#0891b2',
    infoBg: darkMode ? 'rgba(8, 145, 178, 0.12)' : 'rgba(8, 145, 178, 0.08)',
    
    gridColor: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
  }

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard-v4', active: pathname === '/dashboard-v4' },
    { icon: Users, label: 'Kunder', href: '/dashboard-v4/kunder' },
    { icon: AlertCircle, label: 'Problemkunder', href: '/dashboard-v4/problemkunder', badge: problemCustomers.length.toString() },
    { icon: Zap, label: 'Automatik', href: '/dashboard-v4/automatik' },
    { icon: Building2, label: 'Integrationer', href: '/dashboard-v4/integrationer' },
    { icon: Settings, label: 'Indstillinger', href: '/dashboard-v4/indstillinger' },
  ]

  // Render widget with real data
  const renderWidget = (widget: Widget, isOverlay = false) => {
    const baseStyle = {
      border: `1px solid ${isCustomizing ? theme.primary + '40' : theme.cardBorder}`,
      backgroundColor: theme.card,
    }

    const removeButton = isCustomizing && !isOverlay && (
      <button
        onClick={() => removeWidget(widget.id)}
        className="absolute top-2 right-2 p-1.5 rounded-full z-20 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: theme.danger }}
      >
        <X className="w-3.5 h-3.5 text-white" />
      </button>
    )

    switch (widget.type) {
      case 'stat-revenue':
        return (
          <div className="p-4 lg:p-5 rounded-2xl h-full relative group overflow-hidden" style={baseStyle}>
            {removeButton}
            <div className="flex items-start justify-between mb-2 lg:mb-3">
              <div className="p-2 lg:p-2.5 rounded-xl" style={{ backgroundColor: theme.primaryMuted }}>
                <CircleDollarSign className="w-4 h-4 lg:w-5 lg:h-5" style={{ color: theme.primary }} />
              </div>
              <span className="flex items-center gap-1 text-[10px] lg:text-xs font-medium px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full" style={{ backgroundColor: theme.successBg, color: theme.success }}>
                <ArrowUpRight className="w-2.5 h-2.5 lg:w-3 lg:h-3" />12.5%
              </span>
            </div>
            <p className="text-xs lg:text-sm mb-1 truncate" style={{ color: theme.textSecondary }}>Total Omsætning</p>
            <p className="text-lg lg:text-2xl font-bold truncate" style={{ color: theme.text }}>
              {stats ? formatCurrency(stats.total_revenue) : '—'}
            </p>
            <p className="text-[10px] lg:text-xs mt-1 lg:mt-2 truncate" style={{ color: theme.textMuted }}>denne periode</p>
          </div>
        )

      case 'stat-invoices':
        return (
          <div className="p-4 lg:p-5 rounded-2xl h-full relative group overflow-hidden" style={baseStyle}>
            {removeButton}
            <div className="flex items-start justify-between mb-2 lg:mb-3">
              <div className="p-2 lg:p-2.5 rounded-xl" style={{ backgroundColor: theme.infoBg }}>
                <Receipt className="w-4 h-4 lg:w-5 lg:h-5" style={{ color: theme.info }} />
              </div>
              <span className="flex items-center gap-1 text-[10px] lg:text-xs font-medium px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full" style={{ backgroundColor: theme.successBg, color: theme.success }}>
                <ArrowUpRight className="w-2.5 h-2.5 lg:w-3 lg:h-3" />8.2%
              </span>
            </div>
            <p className="text-xs lg:text-sm mb-1 truncate" style={{ color: theme.textSecondary }}>Totale Fakturaer</p>
            <p className="text-lg lg:text-2xl font-bold" style={{ color: theme.text }}>
              {stats?.total_invoices.toLocaleString('da-DK') || '—'}
            </p>
            <div className="flex gap-2 lg:gap-3 mt-1 lg:mt-2 flex-wrap">
              <span className="text-[10px] lg:text-xs whitespace-nowrap" style={{ color: theme.success }}><span className="font-medium">{stats?.paid_count || 0}</span> betalt</span>
              <span className="text-[10px] lg:text-xs whitespace-nowrap" style={{ color: theme.warning }}><span className="font-medium">{stats?.pending_count || 0}</span> afventer</span>
            </div>
          </div>
        )

      case 'stat-payment':
        return (
          <div className="p-4 lg:p-5 rounded-2xl h-full relative group overflow-hidden" style={baseStyle}>
            {removeButton}
            <div className="flex items-start justify-between mb-2 lg:mb-3">
              <div className="p-2 lg:p-2.5 rounded-xl" style={{ backgroundColor: theme.successBg }}>
                <Timer className="w-4 h-4 lg:w-5 lg:h-5" style={{ color: theme.success }} />
              </div>
              <span className="flex items-center gap-1 text-[10px] lg:text-xs font-medium px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full" style={{ backgroundColor: theme.successBg, color: theme.success }}>
                <ArrowDownRight className="w-2.5 h-2.5 lg:w-3 lg:h-3" />-2 dage
              </span>
            </div>
            <p className="text-xs lg:text-sm mb-1 truncate" style={{ color: theme.textSecondary }}>Gns. Betalingstid</p>
            <p className="text-lg lg:text-2xl font-bold" style={{ color: theme.text }}>
              {stats ? Math.round(stats.average_payment_delay) : '—'} dage
            </p>
            <div className="mt-2 lg:mt-3 h-1.5 lg:h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.cardBorder }}>
              <div className="h-full rounded-full" style={{ width: '30%', backgroundColor: theme.success }} />
            </div>
          </div>
        )

      case 'stat-overdue':
        return (
          <div className="p-4 lg:p-5 rounded-2xl h-full relative group overflow-hidden" style={baseStyle}>
            {removeButton}
            <div className="flex items-start justify-between mb-2 lg:mb-3">
              <div className="p-2 lg:p-2.5 rounded-xl" style={{ backgroundColor: theme.dangerBg }}>
                <AlertCircle className="w-4 h-4 lg:w-5 lg:h-5" style={{ color: theme.danger }} />
              </div>
              <Link href="/dashboard-v4/forfaldne" className="text-[10px] lg:text-xs font-medium whitespace-nowrap" style={{ color: theme.primary }}>Se alle →</Link>
            </div>
            <p className="text-xs lg:text-sm mb-1 truncate" style={{ color: theme.textSecondary }}>Forfaldne Fakturaer</p>
            <p className="text-lg lg:text-2xl font-bold" style={{ color: theme.text }}>{stats?.overdue_count || 0}</p>
            <p className="text-[10px] lg:text-xs mt-1 lg:mt-2 truncate" style={{ color: theme.danger }}>kræver opmærksomhed</p>
          </div>
        )

      case 'chart-revenue':
        return (
          <div className="p-4 lg:p-6 rounded-2xl h-full relative group overflow-hidden" style={baseStyle}>
            {removeButton}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 gap-2">
              <div className="min-w-0">
                <h2 className="text-sm lg:text-lg font-semibold truncate" style={{ color: theme.text }}>Omsætningsudvikling</h2>
                <p className="text-xs lg:text-sm truncate" style={{ color: theme.textSecondary }}>Månedlig omsætning</p>
              </div>
              <div className="flex gap-1 lg:gap-2 shrink-0">
                <button className="px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg text-xs lg:text-sm font-medium" style={{ backgroundColor: theme.primaryMuted, color: theme.primary }}>Omsætning</button>
                <button className="px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg text-xs lg:text-sm" style={{ color: theme.textSecondary }}>Fakturaer</button>
              </div>
            </div>
            <div className="h-32 lg:h-48 flex items-end justify-between gap-1 lg:gap-2 px-1 lg:px-4">
              {[65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88, 72].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 lg:gap-2 min-w-0">
                  <div className="w-full rounded-t-lg transition-all hover:opacity-80" style={{ height: `${height}%`, backgroundColor: i === 11 ? theme.primary : theme.primaryMuted }} />
                  <span className="text-[8px] lg:text-xs" style={{ color: theme.textMuted }}>{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-3 lg:gap-6 mt-3 lg:mt-4">
              <div className="flex items-center gap-1 lg:gap-2">
                <div className="w-2 h-2 lg:w-3 lg:h-3 rounded-full" style={{ backgroundColor: theme.primary }} />
                <span className="text-[10px] lg:text-sm" style={{ color: theme.textSecondary }}>Omsætning</span>
              </div>
            </div>
          </div>
        )

      case 'chart-behavior':
        return (
          <div className="p-4 lg:p-6 rounded-2xl h-full relative group flex flex-col overflow-hidden" style={baseStyle}>
            {removeButton}
            <h2 className="text-sm lg:text-lg font-semibold mb-1 truncate" style={{ color: theme.text }}>Kundebetalingsadfærd</h2>
            <p className="text-xs lg:text-sm mb-2 truncate" style={{ color: theme.textSecondary }}>Fordeling baseret på betalingsmønstre</p>
            <div className="flex items-center justify-center flex-1 py-2 lg:py-4">
              <div className="relative w-24 h-24 lg:w-36 lg:h-36">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke={theme.cardBorder} strokeWidth="12" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke={theme.success} strokeWidth="12" strokeDasharray="150 251" strokeLinecap="round" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke={theme.info} strokeWidth="12" strokeDasharray="60 251" strokeDashoffset="-150" strokeLinecap="round" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke={theme.warning} strokeWidth="12" strokeDasharray="30 251" strokeDashoffset="-210" strokeLinecap="round" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke={theme.danger} strokeWidth="12" strokeDasharray="11 251" strokeDashoffset="-240" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-lg lg:text-2xl font-bold" style={{ color: theme.text }}>
                    {customerBehavior.excellent + customerBehavior.good + customerBehavior.slow + customerBehavior.problem}
                  </span>
                  <span className="text-[10px] lg:text-xs" style={{ color: theme.textSecondary }}>kunder</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 lg:gap-2">
              {[
                { label: 'Fremragende', count: customerBehavior.excellent, color: theme.success },
                { label: 'Gode', count: customerBehavior.good, color: theme.info },
                { label: 'Langsomme', count: customerBehavior.slow, color: theme.warning },
                { label: 'Problem', count: customerBehavior.problem, color: theme.danger },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 lg:gap-2 p-1.5 lg:p-2 rounded-lg" style={{ backgroundColor: theme.cardHover }}>
                  <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] lg:text-xs truncate" style={{ color: theme.textSecondary }}>{item.label}</span>
                  <span className="text-[10px] lg:text-xs font-medium ml-auto shrink-0" style={{ color: theme.text }}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )

      case 'actions':
        return (
          <div className="p-4 lg:p-6 rounded-2xl h-full relative group overflow-hidden" style={baseStyle}>
            {removeButton}
            <h2 className="text-sm lg:text-lg font-semibold mb-3 lg:mb-4 truncate" style={{ color: theme.text }}>Hurtige handlinger</h2>
            <div className="space-y-1.5 lg:space-y-2">
              {[
                { icon: Eye, label: 'Gennemgå matches', desc: 'Se betalingsmatches', href: '/dashboard-v4/integrationer', color: theme.info },
                { icon: Users, label: 'Kunder', desc: `${problemCustomers.length} kræver opmærksomhed`, href: '/dashboard-v4/problemkunder', color: theme.primary },
                { icon: Building2, label: 'Integrationer', desc: 'Bank & regnskab', href: '/dashboard-v4/integrationer', color: theme.success },
                { icon: Zap, label: 'Automatik', desc: 'Se rykker-indstillinger', href: '/dashboard-v4/automatik', color: theme.warning },
              ].map((action, i) => (
                <Link key={i} href={action.href} className="w-full flex items-center gap-2 lg:gap-3 p-2 lg:p-3 rounded-xl transition-all text-left" style={{ border: `1px solid ${theme.cardBorder}` }}>
                  <div className="p-1.5 lg:p-2 rounded-lg shrink-0" style={{ backgroundColor: `${action.color}15` }}>
                    <action.icon className="w-3 h-3 lg:w-4 lg:h-4" style={{ color: action.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs lg:text-sm truncate" style={{ color: theme.text }}>{action.label}</p>
                    <p className="text-[10px] lg:text-xs truncate" style={{ color: theme.textSecondary }}>{action.desc}</p>
                  </div>
                  <ChevronRight className="w-3 h-3 lg:w-4 lg:h-4 shrink-0" style={{ color: theme.textMuted }} />
                </Link>
              ))}
            </div>
          </div>
        )

      case 'customers':
        return (
          <div className="rounded-2xl h-full overflow-hidden relative group" style={baseStyle}>
            {removeButton}
            <div className="p-3 lg:p-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-sm lg:text-base truncate" style={{ color: theme.text }}>Kunder der kræver opmærksomhed</h2>
                <p className="text-xs lg:text-sm truncate" style={{ color: theme.textSecondary }}>Automatik håndterer rykkere</p>
              </div>
              <Link href="/dashboard-v4/problemkunder" className="text-xs lg:text-sm font-medium whitespace-nowrap ml-2" style={{ color: theme.primary }}>Se alle →</Link>
            </div>
            <div className="p-2 lg:p-4 space-y-2 lg:space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100% - 80px)' }}>
              {problemCustomers.length > 0 ? problemCustomers.slice(0, 4).map((customer, i) => (
                <div key={i} className="p-2.5 lg:p-3 rounded-xl flex items-center gap-3" style={{ border: `1px solid ${theme.cardBorder}` }}>
                  <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full flex items-center justify-center text-xs lg:text-sm font-semibold shrink-0" style={{ backgroundColor: theme.primaryMuted, color: theme.primary }}>
                    {customer.contact_name?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xs lg:text-sm truncate" style={{ color: theme.text }}>{customer.contact_name}</p>
                    <p className="text-[10px] lg:text-xs truncate" style={{ color: theme.textSecondary }}>
                      {customer.invoice_count} fakturaer • {formatCurrency(customer.overdue_amount)} udestående
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: theme.infoBg }}>
                      <Clock className="w-3 h-3" style={{ color: theme.info }} />
                      <span className="text-[10px] lg:text-xs font-medium" style={{ color: theme.info }}>
                        {Math.round(customer.avg_payment_delay)}d
                      </span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-6 lg:py-8 text-center">
                  <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: theme.successBg }}>
                    <CheckCircle2 className="h-5 w-5 lg:h-6 lg:w-6" style={{ color: theme.success }} />
                  </div>
                  <p className="text-xs lg:text-sm" style={{ color: theme.textSecondary }}>Alle kunder betaler til tiden</p>
                </div>
              )}
            </div>
          </div>
        )

      case 'automation-status':
        return (
          <div className="p-4 lg:p-6 rounded-2xl h-full relative group overflow-hidden" style={baseStyle}>
            {removeButton}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm lg:text-lg font-semibold truncate" style={{ color: theme.text }}>Automatik Status</h2>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ backgroundColor: theme.successBg }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.success }} />
                <span className="text-xs font-medium" style={{ color: theme.success }}>Aktiv</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="p-3 rounded-xl" style={{ border: `1px solid ${theme.cardBorder}` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs" style={{ color: theme.textSecondary }}>Rykkere sendt i dag</span>
                  <span className="text-sm font-bold" style={{ color: theme.text }}>12</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.cardBorder }}>
                  <div className="h-full rounded-full" style={{ width: '60%', backgroundColor: theme.primary }} />
                </div>
              </div>
              <div className="p-3 rounded-xl" style={{ border: `1px solid ${theme.cardBorder}` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs" style={{ color: theme.textSecondary }}>Betalinger registreret</span>
                  <span className="text-sm font-bold" style={{ color: theme.text }}>8</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.cardBorder }}>
                  <div className="h-full rounded-full" style={{ width: '40%', backgroundColor: theme.success }} />
                </div>
              </div>
              <div className="p-3 rounded-xl" style={{ border: `1px solid ${theme.cardBorder}` }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: theme.textSecondary }}>Næste kørsel</span>
                  <span className="text-xs font-medium" style={{ color: theme.primary }}>Om 2 timer</span>
                </div>
              </div>
            </div>
            <Link href="/dashboard-v4/automatik" className="mt-4 w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-medium" style={{ backgroundColor: theme.primaryMuted, color: theme.primary }}>
              <Zap className="w-3.5 h-3.5" />
              Se automatik indstillinger
            </Link>
          </div>
        )

      case 'recent-activity':
        return (
          <div className="rounded-2xl h-full overflow-hidden relative group" style={baseStyle}>
            {removeButton}
            <div className="p-3 lg:p-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-sm lg:text-base truncate" style={{ color: theme.text }}>Seneste Aktivitet</h2>
                <p className="text-xs lg:text-sm truncate" style={{ color: theme.textSecondary }}>Automatiske handlinger</p>
              </div>
            </div>
            <div className="p-3 lg:p-4 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100% - 80px)' }}>
              {[
                { icon: CheckCircle2, text: 'Betaling registreret', detail: 'Kunde ABC - 2.500 kr', time: '5 min siden', color: theme.success },
                { icon: Send, text: 'Rykker 1 sendt', detail: 'Kunde XYZ', time: '1 time siden', color: theme.primary },
                { icon: CheckCircle2, text: 'Betaling registreret', detail: 'Kunde DEF - 1.200 kr', time: '2 timer siden', color: theme.success },
                { icon: Send, text: 'Påmindelse sendt', detail: 'Kunde GHI', time: '3 timer siden', color: theme.info },
                { icon: AlertCircle, text: 'Rykker 3 sendt', detail: 'Kunde JKL - Inkasso snart', time: '5 timer siden', color: theme.warning },
              ].map((activity, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ backgroundColor: i === 0 ? theme.cardHover : 'transparent' }}>
                  <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${activity.color}15` }}>
                    <activity.icon className="w-3.5 h-3.5" style={{ color: activity.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: theme.text }}>{activity.text}</p>
                    <p className="text-[10px] truncate" style={{ color: theme.textSecondary }}>{activity.detail}</p>
                  </div>
                  <span className="text-[10px] shrink-0" style={{ color: theme.textMuted }}>{activity.time}</span>
                </div>
              ))}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Grid class - mobile always single column
  const getWidgetGridClass = (widget: Widget) => {
    if (isMobile) return 'col-span-1'
    switch (widget.size) {
      case 'small': return 'col-span-1'
      case 'medium': return 'col-span-2'
      case 'large': return 'col-span-2'
      case 'full': return 'col-span-4'
      default: return 'col-span-1'
    }
  }

  // Height based on widget type - stat widgets are shorter, all others same height
  const getWidgetMinHeight = (type: WidgetType) => {
    if (isMobile) {
      if (type.startsWith('stat-')) return 'h-[140px]'
      return 'h-[320px]'
    }
    if (type.startsWith('stat-')) return 'h-[180px]'
    return 'h-[380px]'
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden" style={{ backgroundColor: theme.bg }}>
        <div className="p-4 lg:p-6 animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded-lg mb-2" />
          <div className="h-4 w-64 bg-gray-200 rounded-lg mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[140px] lg:h-[180px] bg-gray-200 rounded-2xl" />
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
      {/* Mobile overlay when sidebar is open */}
      {sidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        id="sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        style={{ 
          backgroundColor: theme.sidebarBg,
          borderRight: `1px solid ${theme.sidebarBorder}`,
        }}
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
            <Link 
              key={i} 
              href={item.href}
              onClick={() => isMobile && setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all" 
              style={{ 
                backgroundColor: item.active ? theme.primaryMuted : 'transparent',
                color: item.active ? theme.primary : theme.textSecondary,
                border: item.active ? `1px solid ${theme.primary}30` : '1px solid transparent',
              }}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="flex-1 font-medium text-sm truncate">{item.label}</span>
              {item.badge && item.badge !== '0' && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full" style={{ 
                  backgroundColor: item.active ? theme.primary : theme.cardBorder,
                  color: item.active ? 'white' : theme.textSecondary
                }}>{item.badge}</span>
              )}
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
          <div className="flex items-center gap-3 lg:gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg" style={{ color: theme.textSecondary }}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl w-72" style={{ border: `1px solid ${theme.cardBorder}` }}>
              <Search className="w-4 h-4" style={{ color: theme.textMuted }} />
              <input type="text" placeholder="Søg..." className="bg-transparent outline-none flex-1 text-sm" style={{ color: theme.text }} />
              <kbd className="px-1.5 py-0.5 text-xs rounded" style={{ backgroundColor: theme.cardBorder, color: theme.textMuted }}>⌘K</kbd>
            </div>
          </div>

          <div className="flex items-center gap-1.5 lg:gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className="p-1.5 lg:p-2 rounded-xl transition-colors" style={{ border: `1px solid ${theme.cardBorder}`, color: theme.textSecondary }}>
              {darkMode ? <Sun className="w-4 h-4 lg:w-5 lg:h-5" /> : <Moon className="w-4 h-4 lg:w-5 lg:h-5" />}
            </button>
            <button className="p-1.5 lg:p-2 rounded-xl relative" style={{ border: `1px solid ${theme.cardBorder}`, color: theme.textSecondary }}>
              <Bell className="w-4 h-4 lg:w-5 lg:h-5" />
              <span className="absolute top-1 right-1 lg:top-1.5 lg:right-1.5 w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full" style={{ backgroundColor: theme.danger }} />
            </button>
            <div className="flex items-center gap-1.5 lg:gap-2 ml-1.5 lg:ml-2 pl-2 lg:pl-3" style={{ borderLeft: `1px solid ${theme.cardBorder}` }}>
              <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-xs lg:text-sm font-medium" style={{ backgroundColor: theme.primaryMuted, color: theme.primary }}>AL</div>
              <ChevronDown className="w-3 h-3 lg:w-4 lg:h-4 hidden sm:block" style={{ color: theme.textMuted }} />
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 lg:gap-4 mb-4 lg:mb-6">
            <div className="min-w-0">
              <h1 className="text-xl lg:text-2xl font-bold truncate" style={{ color: theme.text }}>Dashboard</h1>
              <p className="text-xs lg:text-sm truncate" style={{ color: theme.textSecondary }}>
                {isCustomizing ? 'Træk widgets for at omarrangere' : 'Velkommen tilbage! Her er dit overblik.'}
              </p>
            </div>
            {/* Only show customize controls on desktop */}
            {!isMobile && (
              <div className="flex items-center gap-2 shrink-0">
                {!isCustomizing && (
                  <>
                    <button className="flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl text-xs lg:text-sm" style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text }}>
                      <Calendar className="w-3 h-3 lg:w-4 lg:h-4" />
                      <span className="hidden sm:inline">Sidste 30 dage</span>
                    </button>
                    <button className="flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl text-xs lg:text-sm font-medium text-white" style={{ backgroundColor: theme.primary }}>
                      <Download className="w-3 h-3 lg:w-4 lg:h-4" />
                      <span className="hidden sm:inline">Eksporter</span>
                    </button>
                  </>
                )}
                {isCustomizing && (
                  <button 
                    onClick={resetToDefaultLayout}
                    className="flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl text-xs lg:text-sm font-medium transition-all"
                    style={{ 
                      backgroundColor: 'transparent',
                      color: theme.textSecondary,
                      border: `1px solid ${theme.cardBorder}`,
                    }}
                  >
                    <RotateCcw className="w-3 h-3 lg:w-4 lg:h-4" />
                    Nulstil
                  </button>
                )}
                <button 
                  onClick={() => setIsCustomizing(!isCustomizing)}
                  className="flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl text-xs lg:text-sm font-medium transition-all"
                  style={{ 
                    backgroundColor: isCustomizing ? theme.primary : 'transparent',
                    color: isCustomizing ? 'white' : theme.primary,
                    border: `1px solid ${theme.primary}`,
                  }}
                >
                  {isCustomizing ? <Check className="w-3 h-3 lg:w-4 lg:h-4" /> : <Pencil className="w-3 h-3 lg:w-4 lg:h-4" />}
                  {isCustomizing ? 'Gem' : 'Tilpas'}
                </button>
              </div>
            )}
          </div>

          {/* Add Widget Panel - Desktop only */}
          {isCustomizing && !isMobile && (
            <div className="mb-4 lg:mb-6 p-3 lg:p-4 rounded-2xl" style={{ border: `2px dashed ${theme.primary}40`, backgroundColor: theme.primaryMuted }}>
              <p className="text-xs lg:text-sm font-medium mb-2 lg:mb-3" style={{ color: theme.text }}>Tilføj widgets</p>
              {availableWidgets.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {availableWidgets.map((w) => (
                    <button
                      key={w.type}
                      onClick={() => addWidget(w.type)}
                      className="flex items-center gap-2 px-2 lg:px-3 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm transition-all hover:scale-105"
                      style={{ border: `1px solid ${theme.cardBorder}`, backgroundColor: theme.card, color: theme.text }}
                    >
                      <Plus className="w-3 h-3 lg:w-4 lg:h-4" style={{ color: theme.primary }} />
                      <w.icon className="w-3 h-3 lg:w-4 lg:h-4" style={{ color: theme.textSecondary }} />
                      {w.label}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs lg:text-sm" style={{ color: theme.textSecondary }}>Alle widgets er allerede tilføjet</p>
              )}
            </div>
          )}

          {/* Widgets Grid */}
          {isMobile ? (
            // Mobile: Simple grid, no drag-drop, default layout
            <div className="grid grid-cols-1 gap-3">
              {defaultLayout.map((widget) => (
                <div key={widget.id} className={getWidgetMinHeight(widget.type)}>
                  {renderWidget(widget)}
                </div>
              ))}
            </div>
          ) : (
            // Desktop: Draggable grid
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {widgets.map((widget) => (
                    <div key={widget.id} className={`${getWidgetGridClass(widget)} ${getWidgetMinHeight(widget.type)}`}>
                      <SortableWidget 
                        id={widget.id} 
                        isCustomizing={isCustomizing}
                        onResize={(dir) => resizeWidget(widget.id, dir)}
                        canExpand={widget.size !== 'full'}
                        canShrink={widget.size !== 'small'}
                      >
                        {renderWidget(widget)}
                      </SortableWidget>
                    </div>
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeId ? (
                  <div className="opacity-80">
                    {renderWidget(widgets.find(w => w.id === activeId)!, true)}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </main>
    </div>
  )
}
