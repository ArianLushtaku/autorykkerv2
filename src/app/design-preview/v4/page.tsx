'use client'

import { useState } from 'react'
import { 
  Moon, Sun, LayoutDashboard, FileText, Users, Settings, Bell, 
  Search, ChevronDown, ArrowUpRight, ArrowDownRight, MoreHorizontal,
  Zap, Calendar, Download, GripVertical, Plus, X, Pencil, Check,
  TrendingUp, Clock, AlertCircle, CheckCircle2, Timer, ChevronRight,
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

// Widget types
type WidgetType = 'stat-revenue' | 'stat-invoices' | 'stat-payment' | 'stat-overdue' | 
                  'chart-revenue' | 'chart-behavior' | 'actions' | 'invoices' | 'customers'

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
          {/* Drag handle */}
          <div 
            {...attributes} 
            {...listeners}
            className="absolute -top-2 -left-2 p-1.5 rounded-lg cursor-grab active:cursor-grabbing z-20 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: '#7c3aed' }}
          >
            <GripVertical className="w-4 h-4 text-white" />
          </div>
          {/* Resize buttons */}
          <div className="absolute -top-2 right-6 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
            {canShrink && (
              <button
                onClick={() => onResize?.('shrink')}
                className="p-1.5 rounded-lg"
                style={{ backgroundColor: '#7c3aed' }}
                title="Formindsk"
              >
                <Minimize2 className="w-3 h-3 text-white" />
              </button>
            )}
            {canExpand && (
              <button
                onClick={() => onResize?.('expand')}
                className="p-1.5 rounded-lg"
                style={{ backgroundColor: '#7c3aed' }}
                title="Forstør"
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

export default function DesignPreviewV4Page() {
  const [darkMode, setDarkMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  
  // Default layout matching v2 structure
  const defaultLayout: Widget[] = [
    { id: 'w1', type: 'stat-revenue', size: 'small' },
    { id: 'w2', type: 'stat-invoices', size: 'small' },
    { id: 'w3', type: 'stat-payment', size: 'small' },
    { id: 'w4', type: 'stat-overdue', size: 'small' },
    { id: 'w5', type: 'chart-revenue', size: 'large' },
    { id: 'w6', type: 'actions', size: 'small' },
    { id: 'w7', type: 'invoices', size: 'large' },
    { id: 'w8', type: 'customers', size: 'large' },
  ]

  // Dashboard widgets - each widget is individually draggable
  const [widgets, setWidgets] = useState<Widget[]>(defaultLayout)

  // Available widgets to add - filter out already used ones
  const allWidgets: { type: WidgetType; label: string; icon: any }[] = [
    { type: 'stat-revenue', label: 'Omsætning', icon: CircleDollarSign },
    { type: 'stat-invoices', label: 'Fakturaer', icon: Receipt },
    { type: 'stat-payment', label: 'Betalingstid', icon: Timer },
    { type: 'stat-overdue', label: 'Forfaldne', icon: AlertCircle },
    { type: 'chart-revenue', label: 'Omsætningsgraf', icon: BarChart3 },
    { type: 'chart-behavior', label: 'Kundeadfærd', icon: PieChart },
    { type: 'actions', label: 'Hurtige handlinger', icon: Zap },
    { type: 'invoices', label: 'Seneste fakturaer', icon: FileText },
    { type: 'customers', label: 'Problemkunder', icon: Users },
  ]
  
  // Filter to only show widgets not already in use
  const usedTypes = new Set(widgets.map(w => w.type))
  const availableWidgets = allWidgets.filter(w => !usedTypes.has(w.type))

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

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
    // Determine size based on type
    let size: Widget['size'] = 'small'
    if (type.startsWith('chart-') || type === 'invoices' || type === 'customers') {
      size = 'large'
    } else if (type === 'actions') {
      size = 'small'
    }
    
    const newWidget: Widget = {
      id: `w${Date.now()}`,
      type,
      size
    }
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

  // Theme with transparency
  const theme = {
    bg: darkMode ? '#0a0a0a' : '#fafafa',
    card: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    cardBorder: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    cardHover: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    
    sidebar: 'transparent',
    sidebarBorder: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    header: darkMode ? 'rgba(10,10,10,0.85)' : 'rgba(250,250,250,0.85)',
    
    text: darkMode ? '#fafafa' : '#18181b',
    textSecondary: darkMode ? '#a1a1aa' : '#71717a',
    textMuted: darkMode ? '#52525b' : '#d4d4d8',
    
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
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: Receipt, label: 'Fakturaer', badge: '12' },
    { icon: Users, label: 'Kunder' },
    { icon: AlertCircle, label: 'Problemkunder', badge: '3' },
    { icon: Zap, label: 'Automatik' },
    { icon: Building2, label: 'Integrationer' },
    { icon: Settings, label: 'Indstillinger' },
  ]

  // Render individual widget
  const renderWidget = (widget: Widget, isOverlay = false) => {
    const baseStyle = {
      border: `1px solid ${isCustomizing ? theme.primary + '40' : theme.cardBorder}`,
      backgroundColor: theme.card,
    }

    const removeButton = isCustomizing && !isOverlay && (
      <button
        onClick={() => removeWidget(widget.id)}
        className="absolute -top-2 -right-2 p-1 rounded-full z-20 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: theme.danger }}
      >
        <X className="w-3 h-3 text-white" />
      </button>
    )

    switch (widget.type) {
      case 'stat-revenue':
        return (
          <div className="p-5 rounded-2xl h-full relative group" style={baseStyle}>
            {removeButton}
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl" style={{ backgroundColor: theme.primaryMuted }}>
                <CircleDollarSign className="w-5 h-5" style={{ color: theme.primary }} />
              </div>
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: theme.successBg, color: theme.success }}>
                <ArrowUpRight className="w-3 h-3" />12.5%
              </span>
            </div>
            <p className="text-sm mb-1" style={{ color: theme.textSecondary }}>Total Omsætning</p>
            <p className="text-2xl font-bold" style={{ color: theme.text }}>2.361.292 kr</p>
            <p className="text-xs mt-2" style={{ color: theme.textMuted }}>vs. 2.098.450 kr forrige</p>
          </div>
        )

      case 'stat-invoices':
        return (
          <div className="p-5 rounded-2xl h-full relative group" style={baseStyle}>
            {removeButton}
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl" style={{ backgroundColor: theme.infoBg }}>
                <Receipt className="w-5 h-5" style={{ color: theme.info }} />
              </div>
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: theme.successBg, color: theme.success }}>
                <ArrowUpRight className="w-3 h-3" />8.2%
              </span>
            </div>
            <p className="text-sm mb-1" style={{ color: theme.textSecondary }}>Totale Fakturaer</p>
            <p className="text-2xl font-bold" style={{ color: theme.text }}>7.984</p>
            <div className="flex gap-3 mt-2">
              <span className="text-xs" style={{ color: theme.success }}><span className="font-medium">6.842</span> betalt</span>
              <span className="text-xs" style={{ color: theme.warning }}><span className="font-medium">892</span> afventer</span>
            </div>
          </div>
        )

      case 'stat-payment':
        return (
          <div className="p-5 rounded-2xl h-full relative group" style={baseStyle}>
            {removeButton}
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl" style={{ backgroundColor: theme.successBg }}>
                <Timer className="w-5 h-5" style={{ color: theme.success }} />
              </div>
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: theme.successBg, color: theme.success }}>
                <ArrowDownRight className="w-3 h-3" />-2 dage
              </span>
            </div>
            <p className="text-sm mb-1" style={{ color: theme.textSecondary }}>Gns. Betalingstid</p>
            <p className="text-2xl font-bold" style={{ color: theme.text }}>8 dage</p>
            <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.cardBorder }}>
              <div className="h-full rounded-full" style={{ width: '30%', backgroundColor: theme.success }} />
            </div>
          </div>
        )

      case 'stat-overdue':
        return (
          <div className="p-5 rounded-2xl h-full relative group" style={baseStyle}>
            {removeButton}
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl" style={{ backgroundColor: theme.dangerBg }}>
                <AlertCircle className="w-5 h-5" style={{ color: theme.danger }} />
              </div>
              <button className="text-xs font-medium" style={{ color: theme.primary }}>Se alle →</button>
            </div>
            <p className="text-sm mb-1" style={{ color: theme.textSecondary }}>Forfaldne Fakturaer</p>
            <p className="text-2xl font-bold" style={{ color: theme.text }}>250</p>
            <p className="text-xs mt-2" style={{ color: theme.danger }}><span className="font-medium">142.500 kr</span> udestående</p>
          </div>
        )

      case 'chart-revenue':
        return (
          <div className="p-6 rounded-2xl h-full relative group" style={baseStyle}>
            {removeButton}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: theme.text }}>Omsætningsudvikling</h2>
                <p className="text-sm" style={{ color: theme.textSecondary }}>Månedlig omsætning og fakturaer</p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ backgroundColor: theme.primaryMuted, color: theme.primary }}>Omsætning</button>
                <button className="px-3 py-1.5 rounded-lg text-sm" style={{ color: theme.textSecondary }}>Fakturaer</button>
              </div>
            </div>
            <div className="h-48 flex items-end justify-between gap-2 px-4">
              {[65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88, 72].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full rounded-t-lg transition-all hover:opacity-80" style={{ height: `${height}%`, backgroundColor: i === 11 ? theme.primary : theme.primaryMuted }} />
                  <span className="text-xs" style={{ color: theme.textMuted }}>{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.primary }} />
                <span className="text-sm" style={{ color: theme.textSecondary }}>Omsætning</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.info }} />
                <span className="text-sm" style={{ color: theme.textSecondary }}>Fakturaer</span>
              </div>
            </div>
          </div>
        )

      case 'chart-behavior':
        return (
          <div className="p-6 rounded-2xl h-full relative group flex flex-col" style={baseStyle}>
            {removeButton}
            <h2 className="text-lg font-semibold mb-1" style={{ color: theme.text }}>Kundebetalingsadfærd</h2>
            <p className="text-sm mb-2" style={{ color: theme.textSecondary }}>Fordeling baseret på betalingsmønstre</p>
            <div className="flex items-center justify-center flex-1 py-4">
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke={theme.cardBorder} strokeWidth="12" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke={theme.success} strokeWidth="12" strokeDasharray="150 251" strokeLinecap="round" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke={theme.info} strokeWidth="12" strokeDasharray="60 251" strokeDashoffset="-150" strokeLinecap="round" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke={theme.warning} strokeWidth="12" strokeDasharray="30 251" strokeDashoffset="-210" strokeLinecap="round" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke={theme.danger} strokeWidth="12" strokeDasharray="11 251" strokeDashoffset="-240" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-2xl font-bold" style={{ color: theme.text }}>847</span>
                  <span className="text-xs" style={{ color: theme.textSecondary }}>kunder</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Fremragende', count: 512, color: theme.success },
                { label: 'Gode', count: 203, color: theme.info },
                { label: 'Langsomme', count: 98, color: theme.warning },
                { label: 'Problem', count: 34, color: theme.danger },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: theme.cardHover }}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-xs truncate" style={{ color: theme.textSecondary }}>{item.label}</span>
                  <span className="text-xs font-medium ml-auto shrink-0" style={{ color: theme.text }}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )

      case 'actions':
        return (
          <div className="p-6 rounded-2xl h-full relative group" style={baseStyle}>
            {removeButton}
            <h2 className="text-lg font-semibold mb-4" style={{ color: theme.text }}>Hurtige handlinger</h2>
            <div className="space-y-2">
              {[
                { icon: Send, label: 'Send rykkere', desc: '12 klar til afsendelse', color: theme.primary },
                { icon: Eye, label: 'Gennemgå matches', desc: '5 betalinger matcher', color: theme.info },
                { icon: AlertCircle, label: 'Problemkunder', desc: '3 kræver opmærksomhed', color: theme.danger },
                { icon: Building2, label: 'Synkroniser bank', desc: 'Sidst: 2 timer siden', color: theme.success },
              ].map((action, i) => (
                <button key={i} className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left" style={{ border: `1px solid ${theme.cardBorder}` }}>
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${action.color}15` }}>
                    <action.icon className="w-4 h-4" style={{ color: action.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm" style={{ color: theme.text }}>{action.label}</p>
                    <p className="text-xs truncate" style={{ color: theme.textSecondary }}>{action.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0" style={{ color: theme.textMuted }} />
                </button>
              ))}
            </div>
          </div>
        )

      case 'invoices':
        return (
          <div className="rounded-2xl h-full overflow-hidden relative group" style={baseStyle}>
            {removeButton}
            <div className="p-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
              <div>
                <h2 className="font-semibold" style={{ color: theme.text }}>Seneste Fakturaer</h2>
                <p className="text-sm" style={{ color: theme.textSecondary }}>Dine nyeste fakturaer</p>
              </div>
              <button className="text-sm font-medium" style={{ color: theme.primary }}>Se alle →</button>
            </div>
            <div>
              {[
                { id: 'INV-2024-001', customer: 'Acme Corporation', amount: '12.500 kr', status: 'paid', date: '15. dec' },
                { id: 'INV-2024-002', customer: 'TechStart ApS', amount: '8.750 kr', status: 'pending', date: '14. dec' },
                { id: 'INV-2024-003', customer: 'Nordic Solutions', amount: '23.000 kr', status: 'overdue', date: '10. dec' },
                { id: 'INV-2024-004', customer: 'Digital Agency', amount: '5.200 kr', status: 'paid', date: '8. dec' },
              ].map((invoice, i) => (
                <div key={i} className="p-4 flex items-center gap-4 transition-colors hover:bg-white/5" style={{ borderBottom: i < 3 ? `1px solid ${theme.cardBorder}` : 'none' }}>
                  <div className="p-2 rounded-lg" style={{ backgroundColor: theme.primaryMuted }}>
                    <FileText className="w-4 h-4" style={{ color: theme.primary }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: theme.text }}>{invoice.customer}</p>
                    <p className="text-xs" style={{ color: theme.textSecondary }}>{invoice.id}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm" style={{ color: theme.text }}>{invoice.amount}</p>
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ 
                      backgroundColor: invoice.status === 'paid' ? theme.successBg : invoice.status === 'pending' ? theme.warningBg : theme.dangerBg,
                      color: invoice.status === 'paid' ? theme.success : invoice.status === 'pending' ? theme.warning : theme.danger
                    }}>
                      {invoice.status === 'paid' ? <CheckCircle2 className="w-3 h-3" /> : invoice.status === 'pending' ? <Clock className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {invoice.status === 'paid' ? 'Betalt' : invoice.status === 'pending' ? 'Afventer' : 'Forfalden'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'customers':
        return (
          <div className="rounded-2xl h-full overflow-hidden relative group" style={baseStyle}>
            {removeButton}
            <div className="p-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
              <div>
                <h2 className="font-semibold" style={{ color: theme.text }}>Problemkunder</h2>
                <p className="text-sm" style={{ color: theme.textSecondary }}>Kunder der kræver opmærksomhed</p>
              </div>
              <button className="text-sm font-medium" style={{ color: theme.primary }}>Se alle →</button>
            </div>
            <div className="p-4 space-y-3">
              {[
                { name: 'Hansen & Co', invoices: 5, amount: '45.000 kr', risk: 85, days: 45 },
                { name: 'Byggefirma Nord', invoices: 3, amount: '28.500 kr', risk: 72, days: 32 },
                { name: 'IT Solutions ApS', invoices: 2, amount: '12.000 kr', risk: 58, days: 21 },
              ].map((customer, i) => (
                <div key={i} className="p-4 rounded-xl" style={{ border: `1px solid ${theme.cardBorder}` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold" style={{ backgroundColor: theme.dangerBg, color: theme.danger }}>
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm" style={{ color: theme.text }}>{customer.name}</p>
                        <p className="text-xs" style={{ color: theme.textSecondary }}>{customer.invoices} fakturaer • {customer.amount}</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded-lg text-xs font-bold" style={{ 
                      backgroundColor: customer.risk >= 70 ? theme.dangerBg : theme.warningBg,
                      color: customer.risk >= 70 ? theme.danger : theme.warning
                    }}>
                      {customer.risk}% risiko
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: theme.textMuted }}>{customer.days} dage forsinket</span>
                    <button className="text-xs font-medium" style={{ color: theme.primary }}>Send rykker</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Get grid column class based on widget size
  const getWidgetGridClass = (widget: Widget) => {
    switch (widget.size) {
      case 'small': return 'col-span-1'
      case 'medium': return 'col-span-2'
      case 'large': return 'col-span-2'
      case 'full': return 'col-span-4'
      default: return 'col-span-1'
    }
  }

  // Get minimum height for widget type
  const getWidgetMinHeight = (type: WidgetType) => {
    if (type.startsWith('stat-')) return 'h-[180px]'
    if (type.startsWith('chart-')) return 'h-[400px]'
    if (type === 'actions') return 'h-[380px]'
    if (type === 'invoices' || type === 'customers') return 'h-[400px]'
    return 'h-[180px]'
  }

  return (
    <div 
      className="min-h-screen flex"
      style={{ 
        backgroundColor: theme.bg,
        backgroundImage: `radial-gradient(${theme.gridColor} 1.5px, transparent 1.5px)`,
        backgroundSize: '24px 24px',
      }}
    >
      {/* Sidebar */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'
        }`}
        style={{ borderRight: `1px solid ${theme.sidebarBorder}` }}
      >
        <div className="h-16 flex items-center justify-between px-4" style={{ borderBottom: `1px solid ${theme.sidebarBorder}` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.primary }}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && <span className="font-bold text-lg" style={{ color: theme.text }}>Autorykker</span>}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-1.5 rounded-lg" style={{ color: theme.textSecondary }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item, i) => (
            <a key={i} href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all" style={{ 
              backgroundColor: item.active ? theme.primaryMuted : 'transparent',
              color: item.active ? theme.primary : theme.textSecondary,
              border: item.active ? `1px solid ${theme.primary}30` : '1px solid transparent',
            }}>
              <item.icon className="w-5 h-5 shrink-0" />
              {sidebarOpen && (
                <>
                  <span className="flex-1 font-medium text-sm">{item.label}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full" style={{ 
                      backgroundColor: item.active ? theme.primary : theme.cardBorder,
                      color: item.active ? 'white' : theme.textSecondary
                    }}>{item.badge}</span>
                  )}
                </>
              )}
            </a>
          ))}
        </nav>

        {sidebarOpen && (
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
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <header className="h-16 flex items-center justify-between px-6 sticky top-0 z-40 backdrop-blur-md" style={{ backgroundColor: theme.header, borderBottom: `1px solid ${theme.sidebarBorder}` }}>
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 rounded-lg" style={{ color: theme.textSecondary }}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl w-72" style={{ border: `1px solid ${theme.cardBorder}` }}>
              <Search className="w-4 h-4" style={{ color: theme.textMuted }} />
              <input type="text" placeholder="Søg..." className="bg-transparent outline-none flex-1 text-sm" style={{ color: theme.text }} />
              <kbd className="px-1.5 py-0.5 text-xs rounded" style={{ backgroundColor: theme.cardBorder, color: theme.textMuted }}>⌘K</kbd>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-xl transition-colors" style={{ border: `1px solid ${theme.cardBorder}`, color: theme.textSecondary }}>
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button className="p-2 rounded-xl relative" style={{ border: `1px solid ${theme.cardBorder}`, color: theme.textSecondary }}>
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: theme.danger }} />
            </button>
            <div className="flex items-center gap-2 ml-2 pl-3" style={{ borderLeft: `1px solid ${theme.cardBorder}` }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium" style={{ backgroundColor: theme.primaryMuted, color: theme.primary }}>AL</div>
              <ChevronDown className="w-4 h-4" style={{ color: theme.textMuted }} />
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: theme.text }}>Dashboard</h1>
              <p className="text-sm" style={{ color: theme.textSecondary }}>
                {isCustomizing ? 'Træk widgets for at omarrangere • Klik + for at tilføje' : 'Velkommen tilbage! Her er dit overblik.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isCustomizing && (
                <>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text }}>
                    <Calendar className="w-4 h-4" />Sidste 30 dage
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: theme.primary }}>
                    <Download className="w-4 h-4" />Eksporter
                  </button>
                </>
              )}
              {isCustomizing && (
                <button 
                  onClick={resetToDefaultLayout}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ 
                    backgroundColor: 'transparent',
                    color: theme.textSecondary,
                    border: `1px solid ${theme.cardBorder}`,
                  }}
                >
                  <RotateCcw className="w-4 h-4" />
                  Nulstil
                </button>
              )}
              <button 
                onClick={() => setIsCustomizing(!isCustomizing)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ 
                  backgroundColor: isCustomizing ? theme.primary : 'transparent',
                  color: isCustomizing ? 'white' : theme.primary,
                  border: `1px solid ${theme.primary}`,
                }}
              >
                {isCustomizing ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                {isCustomizing ? 'Gem layout' : 'Tilpas'}
              </button>
            </div>
          </div>

          {/* Add Widget Panel - Only visible in customize mode */}
          {isCustomizing && (
            <div className="mb-6 p-4 rounded-2xl" style={{ border: `2px dashed ${theme.primary}40`, backgroundColor: theme.primaryMuted }}>
              <p className="text-sm font-medium mb-3" style={{ color: theme.text }}>Tilføj widgets</p>
              {availableWidgets.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {availableWidgets.map((w) => (
                    <button
                      key={w.type}
                      onClick={() => addWidget(w.type)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:scale-105"
                      style={{ border: `1px solid ${theme.cardBorder}`, backgroundColor: theme.card, color: theme.text }}
                    >
                      <Plus className="w-4 h-4" style={{ color: theme.primary }} />
                      <w.icon className="w-4 h-4" style={{ color: theme.textSecondary }} />
                      {w.label}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: theme.textSecondary }}>Alle widgets er allerede tilføjet</p>
              )}
            </div>
          )}

          {/* Draggable Widgets Grid */}
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
        </div>
      </main>
    </div>
  )
}
