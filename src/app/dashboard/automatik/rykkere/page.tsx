'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Mail, MessageSquare, RefreshCw, Save, Search, Check, X, Link2, Zap, Clock, TrendingUp, AlertTriangle, RotateCcw, Archive } from 'lucide-react'

interface AutomationSettings {
  id: string
  user_id: string
  automation_enabled: boolean
  // Pre-reminder (Påmindelse)
  pre_reminder_enabled: boolean
  pre_reminder_days_after_due: number
  pre_reminder_email: boolean
  pre_reminder_sms: boolean
  // Rykker 1
  rykker_1_enabled: boolean
  rykker_1_days_after_pre: number
  rykker_1_email: boolean
  rykker_1_sms: boolean
  // Rykker 2
  rykker_2_enabled: boolean
  rykker_2_days_after_rykker_1: number
  rykker_2_email: boolean
  rykker_2_sms: boolean
  // Rykker 3
  rykker_3_enabled: boolean
  rykker_3_days_after_rykker_2: number
  rykker_3_email: boolean
  rykker_3_sms: boolean
  // Inkasso
  auto_inkasso_enabled: boolean
  // SMS Templates
  company_name?: string
  sms_prereminder_template?: string
  sms_reminder_template?: string
}

interface AutomationStats {
  total_reminders_sent: number
  reminders_this_month: number
  overdue_invoices: number
  success_rate: number
}


interface UnmatchedTransaction {
  id: string
  transaction_id: string
  transaction_date: string
  transaction_amount: number
  transaction_reference: string
  transaction_debtor_name: string
  status: string
  matched_invoice_id: string | null
  matched_invoice_number: string | null
}

interface Invoice {
  id: string
  invoice_number: number
  contact_name: string
  total_incl_vat: number
  status: string
}

const DEFAULT_SETTINGS: Omit<AutomationSettings, 'id'> = {
  user_id: '',
  automation_enabled: false,
  // Pre-reminder
  pre_reminder_enabled: true,
  pre_reminder_days_after_due: 3,
  pre_reminder_email: true,
  pre_reminder_sms: false,
  // Rykker 1 (min 10 days per Danish law)
  rykker_1_enabled: true,
  rykker_1_days_after_pre: 10,
  rykker_1_email: true,
  rykker_1_sms: false,
  // Rykker 2 (min 10 days per Danish law)
  rykker_2_enabled: true,
  rykker_2_days_after_rykker_1: 10,
  rykker_2_email: true,
  rykker_2_sms: false,
  // Rykker 3 (min 10 days per Danish law)
  rykker_3_enabled: true,
  rykker_3_days_after_rykker_2: 10,
  rykker_3_email: true,
  rykker_3_sms: false,
  // Inkasso
  auto_inkasso_enabled: false
}

export default function ReminderAutomationPage() {
  const [activeTab, setActiveTab] = useState<'settings' | 'matching'>('settings')
  const [matchingSubTab, setMatchingSubTab] = useState<'pending' | 'processed'>('pending')
  const [settings, setSettings] = useState<AutomationSettings | null>(null)
  const [stats, setStats] = useState<AutomationStats | null>(null)
  const [unmatchedTransactions, setUnmatchedTransactions] = useState<UnmatchedTransaction[]>([])
  const [processedTransactions, setProcessedTransactions] = useState<UnmatchedTransaction[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [matchingInvoice, setMatchingInvoice] = useState<{ [key: string]: string }>({})
  const [invoiceSearch, setInvoiceSearch] = useState<{ [key: string]: string }>({})
  const [showDaysWarning, setShowDaysWarning] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // Fetch automation settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('automation_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error fetching settings:', settingsError)
      }

      if (settingsData) {
        setSettings(settingsData)
      } else {
        // Create default settings for user
        const newSettings = { ...DEFAULT_SETTINGS, user_id: user.id }
        const { data: created } = await supabase
          .from('automation_settings')
          .insert(newSettings)
          .select()
          .single()
        if (created) setSettings(created)
      }

      // Fetch stats
      const { data: remindersData } = await supabase
        .from('invoice_reminders')
        .select('id, reminder_date, reminder_number')
        .eq('user_id', user.id)

      const today = new Date().toISOString().split('T')[0]
      const { count: overdueCount } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['Booked', 'Overdue'])
        .lt('payment_date', today)

      const thisMonth = new Date()
      thisMonth.setDate(1)
      const thisMonthStr = thisMonth.toISOString().split('T')[0]
      const remindersThisMonth = remindersData?.filter(r => 
        r.reminder_date && r.reminder_date >= thisMonthStr
      ).length || 0

      const { data: reminderInvoices } = await supabase
        .from('invoices')
        .select('id, status, latest_mail_out_type')
        .eq('user_id', user.id)
        .in('latest_mail_out_type', ['Reminder', 'PreReminder'])

      const paidAfterReminder = reminderInvoices?.filter(inv => inv.status === 'Paid').length || 0
      const totalWithReminders = reminderInvoices?.length || 0
      const successRate = totalWithReminders > 0 
        ? Math.round((paidAfterReminder / totalWithReminders) * 100) 
        : 100

      setStats({
        total_reminders_sent: remindersData?.length || 0,
        reminders_this_month: remindersThisMonth,
        overdue_invoices: overdueCount || 0,
        success_rate: successRate
      })

      // Fetch unmatched transactions (pending)
      const { data: unmatchedData } = await supabase
        .from('unmatched_transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('transaction_date', { ascending: false })
        .limit(50)

      if (unmatchedData) {
        setUnmatchedTransactions(unmatchedData)
      }

      // Fetch processed transactions (matched or ignored)
      const { data: processedData } = await supabase
        .from('unmatched_transactions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['matched', 'ignored'])
        .order('reviewed_at', { ascending: false })
        .limit(50)

      if (processedData) {
        setProcessedTransactions(processedData)
      }

      // Fetch unpaid invoices for matching
      const { data: unpaidInvoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, contact_name, total_incl_vat, status')
        .eq('user_id', user.id)
        .in('status', ['Booked', 'Overdue'])
        .order('invoice_number', { ascending: false })
        .limit(500)

      if (unpaidInvoices) {
        setInvoices(unpaidInvoices)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const updateSetting = <K extends keyof AutomationSettings>(key: K, value: AutomationSettings[K]) => {
    if (!settings) return
    setSettings({ ...settings, [key]: value })
    setHasChanges(true)
  }

  const saveSettings = async () => {
    if (!settings || !userId) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('automation_settings')
        .update({
          automation_enabled: settings.automation_enabled,
          pre_reminder_enabled: settings.pre_reminder_enabled,
          pre_reminder_days_after_due: settings.pre_reminder_days_after_due,
          pre_reminder_email: settings.pre_reminder_email,
          pre_reminder_sms: settings.pre_reminder_sms,
          rykker_1_enabled: settings.rykker_1_enabled,
          rykker_1_days_after_pre: settings.rykker_1_days_after_pre,
          rykker_1_email: settings.rykker_1_email,
          rykker_1_sms: settings.rykker_1_sms,
          rykker_2_enabled: settings.rykker_2_enabled,
          rykker_2_days_after_rykker_1: settings.rykker_2_days_after_rykker_1,
          rykker_2_email: settings.rykker_2_email,
          rykker_2_sms: settings.rykker_2_sms,
          rykker_3_enabled: settings.rykker_3_enabled,
          rykker_3_days_after_rykker_2: settings.rykker_3_days_after_rykker_2,
          rykker_3_email: settings.rykker_3_email,
          rykker_3_sms: settings.rykker_3_sms,
          auto_inkasso_enabled: settings.auto_inkasso_enabled,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
      if (error) throw error
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const toggleAutomation = async () => {
    if (!settings) return
    const newValue = !settings.automation_enabled
    updateSetting('automation_enabled', newValue)
    try {
      await supabase
        .from('automation_settings')
        .update({ automation_enabled: newValue, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
      setHasChanges(false)
    } catch (error) {
      console.error('Error toggling automation:', error)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('da-DK')
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(amount)
  }

  const handleManualMatch = async (transactionId: string, invoiceNumber: string) => {
    if (!userId || !invoiceNumber) return
    
    try {
      const invoice = invoices.find(i => i.invoice_number === parseInt(invoiceNumber))
      if (!invoice) return

      const tx = unmatchedTransactions.find(t => t.id === transactionId)
      
      await supabase
        .from('unmatched_transactions')
        .update({
          status: 'matched',
          matched_invoice_id: invoice.id,
          matched_invoice_number: invoiceNumber,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId
        })
        .eq('id', transactionId)

      // Move to processed and remove from pending
      if (tx) {
        setProcessedTransactions(prev => [{ ...tx, status: 'matched', matched_invoice_number: invoiceNumber }, ...prev])
      }
      setUnmatchedTransactions(prev => prev.filter(t => t.id !== transactionId))
      setMatchingInvoice(prev => ({ ...prev, [transactionId]: '' }))
      setInvoiceSearch(prev => ({ ...prev, [transactionId]: '' }))
    } catch (error) {
      console.error('Error matching transaction:', error)
    }
  }

  const handleDismissTransaction = async (transactionId: string) => {
    if (!userId) return
    
    try {
      const tx = unmatchedTransactions.find(t => t.id === transactionId)
      
      await supabase
        .from('unmatched_transactions')
        .update({
          status: 'ignored',
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId
        })
        .eq('id', transactionId)

      // Move to processed and remove from pending
      if (tx) {
        setProcessedTransactions(prev => [{ ...tx, status: 'ignored' }, ...prev])
      }
      setUnmatchedTransactions(prev => prev.filter(t => t.id !== transactionId))
    } catch (error) {
      console.error('Error dismissing transaction:', error)
    }
  }

  const handleRevertTransaction = async (transactionId: string) => {
    if (!userId) return
    
    try {
      const tx = processedTransactions.find(t => t.id === transactionId)
      
      await supabase
        .from('unmatched_transactions')
        .update({
          status: 'pending',
          matched_invoice_id: null,
          matched_invoice_number: null,
          reviewed_at: null,
          reviewed_by: null
        })
        .eq('id', transactionId)

      // Move back to pending
      if (tx) {
        setUnmatchedTransactions(prev => [{ ...tx, status: 'pending', matched_invoice_id: null, matched_invoice_number: null }, ...prev])
      }
      setProcessedTransactions(prev => prev.filter(t => t.id !== transactionId))
    } catch (error) {
      console.error('Error reverting transaction:', error)
    }
  }

  // Filter invoices for a specific transaction's search
  const getFilteredInvoices = (transactionId: string) => {
    const search = invoiceSearch[transactionId] || ''
    if (!search) return []
    return invoices.filter(inv => 
      inv.invoice_number.toString().includes(search) ||
      inv.contact_name.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 5)
  }

  // Get the last enabled rykker for inkasso text (minimum Rykker 1)
  const getLastEnabledRykker = () => {
    if (!settings) return 'Rykker 3'
    if (settings.rykker_3_enabled) return 'Rykker 3'
    if (settings.rykker_2_enabled) return 'Rykker 2'
    return 'Rykker 1' // Minimum is Rykker 1, inkasso can't happen after only Påmindelse
  }

  // Handle days change with 10-day minimum validation
  const handleDaysChange = (key: keyof AutomationSettings, value: number, fieldName: string) => {
    if (value < 10) {
      setShowDaysWarning(fieldName)
      setTimeout(() => setShowDaysWarning(null), 4000)
      updateSetting(key, 10)
    } else {
      updateSetting(key, value)
    }
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">Rykkerautomatik</h1>
          <p className="text-gray-6">Automatiser dine betalingspåmindelser og rykkere</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <button 
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Gem Ændringer
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-dark p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rykkere Sendt</p>
                <p className="text-2xl font-bold text-dark dark:text-white">{stats.total_reminders_sent.toLocaleString('da-DK')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-dark p-6 rounded-lg shadow-sm border-l-4 border-green-500">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Denne Måned</p>
                <p className="text-2xl font-bold text-dark dark:text-white">{stats.reminders_this_month}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-dark p-6 rounded-lg shadow-sm border-l-4 border-orange-500">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Forfaldne</p>
                <p className="text-2xl font-bold text-dark dark:text-white">{stats.overdue_invoices}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-dark p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
            <div className="flex items-center">
              <Check className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Succesrate</p>
                <p className="text-2xl font-bold text-dark dark:text-white">{stats.success_rate}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-stroke dark:border-gray-700">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Rykkerindstillinger
          </button>
          <button
            onClick={() => setActiveTab('matching')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'matching'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Manuel Matching
            {unmatchedTransactions.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unmatchedTransactions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && settings && (
        <div className="space-y-6">
          {/* Global Automation Toggle */}
          <div className="bg-white dark:bg-gray-dark rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-dark dark:text-white">Automatisk Rykkerudsendelse</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Når aktiveret, sender systemet automatisk rykkere baseret på nedenstående regler
                </p>
              </div>
              <button
                onClick={toggleAutomation}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                  settings.automation_enabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  settings.automation_enabled ? 'translate-x-8' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>

          {/* Reminder Rules Table - Desktop */}
          <div className="bg-white dark:bg-gray-dark rounded-lg shadow-sm hidden md:block">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trin</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Timing</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notifikation</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aktiv</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke dark:divide-gray-700">
                {/* Påmindelse */}
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    <span className="font-medium text-dark dark:text-white">Påmindelse</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Venlig påmindelse</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <input type="number" value={settings.pre_reminder_days_after_due} onChange={(e) => updateSetting('pre_reminder_days_after_due', parseInt(e.target.value) || 0)} className="w-16 px-2 py-1 text-center border border-stroke dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-dark dark:text-white text-sm" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">dage efter forfald</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={settings.pre_reminder_email} onChange={(e) => updateSetting('pre_reminder_email', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                        <Mail className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={settings.pre_reminder_sms} onChange={(e) => updateSetting('pre_reminder_sms', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                        <MessageSquare className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">SMS</span>
                      </label>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => updateSetting('pre_reminder_enabled', !settings.pre_reminder_enabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.pre_reminder_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.pre_reminder_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </td>
                </tr>
                {/* Rykker 1 */}
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <span className="font-medium text-dark dark:text-white">Rykker 1</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 ml-4">Første rykker</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <input type="number" min="10" value={settings.rykker_1_days_after_pre} onChange={(e) => handleDaysChange('rykker_1_days_after_pre', parseInt(e.target.value) || 10, 'rykker_1')} className="w-16 px-2 py-1 text-center border border-stroke dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-dark dark:text-white text-sm" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">dage efter påmindelse</span>
                      </div>
                      {showDaysWarning === 'rykker_1' && <div className="absolute top-full left-0 mt-1 p-2 bg-orange-100 dark:bg-orange-900/50 border border-orange-300 dark:border-orange-700 rounded-lg text-xs text-orange-800 dark:text-orange-200 whitespace-nowrap z-10">⚠️ Ifølge dansk lovgivning skal der gå minimum 10 dage for hver rykker.</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={settings.rykker_1_email} onChange={(e) => updateSetting('rykker_1_email', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                        <Mail className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={settings.rykker_1_sms} onChange={(e) => updateSetting('rykker_1_sms', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                        <MessageSquare className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">SMS</span>
                      </label>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => updateSetting('rykker_1_enabled', !settings.rykker_1_enabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.rykker_1_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.rykker_1_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </td>
                </tr>
                {/* Rykker 2 */}
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <span className="font-medium text-dark dark:text-white">Rykker 2</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 ml-4">Anden rykker</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <input type="number" min="10" value={settings.rykker_2_days_after_rykker_1} onChange={(e) => handleDaysChange('rykker_2_days_after_rykker_1', parseInt(e.target.value) || 10, 'rykker_2')} className="w-16 px-2 py-1 text-center border border-stroke dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-dark dark:text-white text-sm" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">dage efter Rykker 1</span>
                      </div>
                      {showDaysWarning === 'rykker_2' && <div className="absolute top-full left-0 mt-1 p-2 bg-orange-100 dark:bg-orange-900/50 border border-orange-300 dark:border-orange-700 rounded-lg text-xs text-orange-800 dark:text-orange-200 whitespace-nowrap z-10">⚠️ Ifølge dansk lovgivning skal der gå minimum 10 dage for hver rykker.</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={settings.rykker_2_email} onChange={(e) => updateSetting('rykker_2_email', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                        <Mail className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={settings.rykker_2_sms} onChange={(e) => updateSetting('rykker_2_sms', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                        <MessageSquare className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">SMS</span>
                      </label>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => updateSetting('rykker_2_enabled', !settings.rykker_2_enabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.rykker_2_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.rykker_2_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </td>
                </tr>
                {/* Rykker 3 */}
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="font-medium text-dark dark:text-white">Rykker 3</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 ml-4">Tredje rykker</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <input type="number" min="10" value={settings.rykker_3_days_after_rykker_2} onChange={(e) => handleDaysChange('rykker_3_days_after_rykker_2', parseInt(e.target.value) || 10, 'rykker_3')} className="w-16 px-2 py-1 text-center border border-stroke dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-dark dark:text-white text-sm" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">dage efter Rykker 2</span>
                      </div>
                      {showDaysWarning === 'rykker_3' && <div className="absolute top-full left-0 mt-1 p-2 bg-orange-100 dark:bg-orange-900/50 border border-orange-300 dark:border-orange-700 rounded-lg text-xs text-orange-800 dark:text-orange-200 whitespace-nowrap z-10">⚠️ Ifølge dansk lovgivning skal der gå minimum 10 dage for hver rykker.</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={settings.rykker_3_email} onChange={(e) => updateSetting('rykker_3_email', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                        <Mail className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={settings.rykker_3_sms} onChange={(e) => updateSetting('rykker_3_sms', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                        <MessageSquare className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">SMS</span>
                      </label>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => updateSetting('rykker_3_enabled', !settings.rykker_3_enabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.rykker_3_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.rykker_3_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Reminder Rules - Mobile Cards */}
          <div className="md:hidden space-y-3">
            {[
              { key: 'pre', name: 'Påmindelse', desc: 'Venlig påmindelse', color: null, daysKey: 'pre_reminder_days_after_due' as const, daysLabel: 'dage efter forfald', enabledKey: 'pre_reminder_enabled' as const, emailKey: 'pre_reminder_email' as const, smsKey: 'pre_reminder_sms' as const, minDays: false },
              { key: 'rykker_1', name: 'Rykker 1', desc: 'Første rykker', color: 'yellow', daysKey: 'rykker_1_days_after_pre' as const, daysLabel: 'dage efter påmindelse', enabledKey: 'rykker_1_enabled' as const, emailKey: 'rykker_1_email' as const, smsKey: 'rykker_1_sms' as const, minDays: true },
              { key: 'rykker_2', name: 'Rykker 2', desc: 'Anden rykker', color: 'orange', daysKey: 'rykker_2_days_after_rykker_1' as const, daysLabel: 'dage efter Rykker 1', enabledKey: 'rykker_2_enabled' as const, emailKey: 'rykker_2_email' as const, smsKey: 'rykker_2_sms' as const, minDays: true },
              { key: 'rykker_3', name: 'Rykker 3', desc: 'Tredje rykker', color: 'red', daysKey: 'rykker_3_days_after_rykker_2' as const, daysLabel: 'dage efter Rykker 2', enabledKey: 'rykker_3_enabled' as const, emailKey: 'rykker_3_email' as const, smsKey: 'rykker_3_sms' as const, minDays: true },
            ].map((item) => (
              <div key={item.key} className={`bg-white dark:bg-gray-dark rounded-lg shadow-sm p-4 ${item.color ? `border-l-4 border-${item.color}-500` : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {item.color && <div className={`w-2 h-2 rounded-full bg-${item.color}-500`}></div>}
                    <div>
                      <span className="font-medium text-dark dark:text-white">{item.name}</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                    </div>
                  </div>
                  <button onClick={() => updateSetting(item.enabledKey, !settings[item.enabledKey])} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings[item.enabledKey] ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings[item.enabledKey] ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={item.minDays ? 10 : undefined}
                      value={settings[item.daysKey]}
                      onChange={(e) => item.minDays ? handleDaysChange(item.daysKey, parseInt(e.target.value) || 10, item.key) : updateSetting(item.daysKey, parseInt(e.target.value) || 0)}
                      className="w-14 px-2 py-1 text-center border border-stroke dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-dark dark:text-white text-sm"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{item.daysLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={settings[item.emailKey]} onChange={(e) => updateSetting(item.emailKey, e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                      <Mail className="h-4 w-4 text-blue-500" />
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={settings[item.smsKey]} onChange={(e) => updateSetting(item.smsKey, e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                      <MessageSquare className="h-4 w-4 text-green-500" />
                    </label>
                  </div>
                </div>
                {showDaysWarning === item.key && (
                  <div className="mt-2 p-2 bg-orange-100 dark:bg-orange-900/50 border border-orange-300 dark:border-orange-700 rounded-lg text-xs text-orange-800 dark:text-orange-200">
                    ⚠️ Minimum 10 dage mellem rykkere (dansk lov)
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Inkasso */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg shadow-sm p-6 border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-dark dark:text-white">Automatisk Inkasso</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Flyt automatisk til inkasso-kø efter {getLastEnabledRykker()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => updateSetting('auto_inkasso_enabled', !settings.auto_inkasso_enabled)}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                  settings.auto_inkasso_enabled ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  settings.auto_inkasso_enabled ? 'translate-x-8' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Matching Tab */}
      {activeTab === 'matching' && (
        <div className="space-y-4">
          {/* Sub-tabs for pending vs processed */}
          <div className="flex gap-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
            <button
              onClick={() => setMatchingSubTab('pending')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                matchingSubTab === 'pending'
                  ? 'bg-white dark:bg-gray-dark text-dark dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Afventer ({unmatchedTransactions.length})
            </button>
            <button
              onClick={() => setMatchingSubTab('processed')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                matchingSubTab === 'processed'
                  ? 'bg-white dark:bg-gray-dark text-dark dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Behandlet ({processedTransactions.length})
            </button>
          </div>

          {/* Pending Transactions */}
          {matchingSubTab === 'pending' && (
            <>
              {unmatchedTransactions.length === 0 ? (
                <div className="bg-white dark:bg-gray-dark rounded-lg shadow-sm p-12 text-center">
                  <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <h3 className="text-lg font-medium text-dark dark:text-white mb-2">Alle transaktioner er behandlet</h3>
                  <p className="text-gray-500 dark:text-gray-400">Der er ingen ukendte transaktioner at gennemgå</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-dark rounded-lg shadow-sm overflow-hidden">
                  <div className="divide-y divide-stroke dark:divide-gray-700">
                    {unmatchedTransactions.map((tx) => (
                      <div key={tx.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        {/* Transaction info */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-lg font-semibold text-green-600 dark:text-green-400">{formatAmount(tx.transaction_amount)}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{formatDate(tx.transaction_date)}</span>
                          </div>
                          <p className="text-sm font-medium text-dark dark:text-white">{tx.transaction_debtor_name}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono truncate">{tx.transaction_reference}</p>
                        </div>

                        {/* Matching controls - mobile friendly stacked layout */}
                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="flex flex-1 gap-2">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Søg faktura..."
                                value={invoiceSearch[tx.id] || ''}
                                onChange={(e) => setInvoiceSearch(prev => ({ ...prev, [tx.id]: e.target.value }))}
                                className="w-full pl-9 pr-3 py-2 border border-stroke dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-dark dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                              />
                            </div>
                            <input
                              type="text"
                              placeholder="#"
                              value={matchingInvoice[tx.id] || ''}
                              onChange={(e) => setMatchingInvoice(prev => ({ ...prev, [tx.id]: e.target.value }))}
                              className="px-3 py-2 w-20 border border-stroke dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-dark dark:text-white text-sm text-center"
                            />
                          </div>
                          <div className="flex gap-2 sm:flex-shrink-0">
                            <button
                              onClick={() => handleManualMatch(tx.id, matchingInvoice[tx.id] || '')}
                              disabled={!matchingInvoice[tx.id]}
                              className="flex-1 sm:flex-none p-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                              title="Match til faktura"
                            >
                              <Link2 className="h-4 w-4" />
                              <span className="sm:hidden">Match</span>
                            </button>
                            <button
                              onClick={() => handleDismissTransaction(tx.id)}
                              className="flex-1 sm:flex-none p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-stroke dark:border-gray-600 rounded-lg transition-colors flex items-center justify-center gap-2"
                              title="Ignorer transaktion"
                            >
                              <X className="h-4 w-4" />
                              <span className="sm:hidden">Ignorer</span>
                            </button>
                          </div>
                        </div>

                        {/* Invoice suggestions dropdown */}
                        {invoiceSearch[tx.id] && getFilteredInvoices(tx.id).length > 0 && (
                          <div className="mt-3 border border-stroke dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                            {getFilteredInvoices(tx.id).map((inv) => (
                              <button
                                key={inv.id}
                                onClick={() => {
                                  setMatchingInvoice(prev => ({ ...prev, [tx.id]: inv.invoice_number.toString() }))
                                  setInvoiceSearch(prev => ({ ...prev, [tx.id]: '' }))
                                }}
                                className="w-full px-4 py-3 text-left text-sm hover:bg-primary/10 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 border-b border-stroke dark:border-gray-700 last:border-0"
                              >
                                <span className="text-dark dark:text-white font-medium">#{inv.invoice_number} - {inv.contact_name}</span>
                                <span className="text-green-600 dark:text-green-400 font-semibold">{formatAmount(inv.total_incl_vat)}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Processed Transactions */}
          {matchingSubTab === 'processed' && (
            <>
              {processedTransactions.length === 0 ? (
                <div className="bg-white dark:bg-gray-dark rounded-lg shadow-sm p-12 text-center">
                  <Archive className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-dark dark:text-white mb-2">Ingen behandlede transaktioner</h3>
                  <p className="text-gray-500 dark:text-gray-400">Matchede og ignorerede transaktioner vises her</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-dark rounded-lg shadow-sm overflow-hidden">
                  <div className="divide-y divide-stroke dark:divide-gray-700">
                    {processedTransactions.map((tx) => (
                      <div key={tx.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-lg font-semibold text-dark dark:text-white">{formatAmount(tx.transaction_amount)}</span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(tx.transaction_date)}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                tx.status === 'matched' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                              }`}>
                                {tx.status === 'matched' ? `Matchet → #${tx.matched_invoice_number}` : 'Ignoreret'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{tx.transaction_debtor_name}</p>
                          </div>
                          <button
                            onClick={() => handleRevertTransaction(tx.id)}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Fortryd"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Fortryd
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
