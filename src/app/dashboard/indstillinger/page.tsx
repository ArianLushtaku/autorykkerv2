'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User, Building, Mail, Phone, CreditCard, Bell, Shield, Save } from 'lucide-react'

interface UserSettings {
  company_name: string
  contact_person: string
  email: string
  phone: string
  address: string
  cvr_number: string
  payment_terms: number
  currency: string
  language: string
  timezone: string
}

interface NotificationSettings {
  email_reminders: boolean
  sms_notifications: boolean
  overdue_alerts: boolean
  payment_confirmations: boolean
  weekly_reports: boolean
}

export default function SettingsPage() {
  const [userSettings, setUserSettings] = useState<UserSettings>({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    cvr_number: '',
    payment_terms: 30,
    currency: 'DKK',
    language: 'da',
    timezone: 'Europe/Copenhagen'
  })

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email_reminders: true,
    sms_notifications: false,
    overdue_alerts: true,
    payment_confirmations: true,
    weekly_reports: true
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'company' | 'notifications' | 'security'>('company')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Mock data for MVP - replace with real Supabase query
      const mockUserSettings: UserSettings = {
        company_name: 'Min Virksomhed ApS',
        contact_person: user.user_metadata?.full_name || 'Bruger',
        email: user.email || '',
        phone: '+45 12 34 56 78',
        address: 'Hovedgade 123, 1000 København',
        cvr_number: '12345678',
        payment_terms: 30,
        currency: 'DKK',
        language: 'da',
        timezone: 'Europe/Copenhagen'
      }

      setUserSettings(mockUserSettings)
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Here you would save to Supabase
      // await supabase.from('user_settings').upsert({
      //   user_id: user.id,
      //   ...userSettings,
      //   ...notificationSettings
      // })

      alert('Indstillinger gemt!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Fejl ved gemning af indstillinger')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof UserSettings, value: string | number) => {
    setUserSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNotificationChange = (field: keyof NotificationSettings, value: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [field]: value
    }))
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
          <h1 className="text-2xl font-bold text-dark dark:text-white">Indstillinger</h1>
          <p className="text-gray-6">Administrer dine konto- og systemindstillinger</p>
        </div>
        <button 
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Gemmer...' : 'Gem Ændringer'}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-dark rounded-lg shadow-sm">
        <div className="border-b border-stroke">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'company', label: 'Virksomhed', icon: Building },
              { id: 'notifications', label: 'Notifikationer', icon: Bell },
              { id: 'security', label: 'Sikkerhed', icon: Shield }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Company Settings */}
          {activeTab === 'company' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-dark dark:text-white mb-4">Virksomhedsoplysninger</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Virksomhedsnavn
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={userSettings.company_name}
                        onChange={(e) => handleInputChange('company_name', e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-stroke rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="Din virksomhed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Kontaktperson
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={userSettings.contact_person}
                        onChange={(e) => handleInputChange('contact_person', e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-stroke rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="Dit navn"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        value={userSettings.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-stroke rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="din@email.dk"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Telefon
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        type="tel"
                        value={userSettings.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-stroke rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="+45 12 34 56 78"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Adresse
                    </label>
                    <input
                      type="text"
                      value={userSettings.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full px-4 py-2 border border-stroke rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="Hovedgade 123, 1000 København"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CVR-nummer
                    </label>
                    <input
                      type="text"
                      value={userSettings.cvr_number}
                      onChange={(e) => handleInputChange('cvr_number', e.target.value)}
                      className="w-full px-4 py-2 border border-stroke rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="12345678"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Betalingsfrist (dage)
                    </label>
                    <select
                      value={userSettings.payment_terms}
                      onChange={(e) => handleInputChange('payment_terms', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-stroke rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value={14}>14 dage</option>
                      <option value={30}>30 dage</option>
                      <option value={60}>60 dage</option>
                      <option value={90}>90 dage</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-dark dark:text-white mb-4">Systemindstillinger</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Valuta
                    </label>
                    <select
                      value={userSettings.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                      className="w-full px-4 py-2 border border-stroke rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="DKK">DKK - Danske Kroner</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="USD">USD - US Dollar</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sprog
                    </label>
                    <select
                      value={userSettings.language}
                      onChange={(e) => handleInputChange('language', e.target.value)}
                      className="w-full px-4 py-2 border border-stroke rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="da">Dansk</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tidszone
                    </label>
                    <select
                      value={userSettings.timezone}
                      onChange={(e) => handleInputChange('timezone', e.target.value)}
                      className="w-full px-4 py-2 border border-stroke rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="Europe/Copenhagen">København (CET)</option>
                      <option value="Europe/London">London (GMT)</option>
                      <option value="America/New_York">New York (EST)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-dark dark:text-white mb-4">Notifikationsindstillinger</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Vælg hvilke notifikationer du vil modtage
                </p>

                <div className="space-y-4">
                  {[
                    {
                      key: 'email_reminders' as keyof NotificationSettings,
                      title: 'Email påmindelser',
                      description: 'Modtag email når rykkere sendes automatisk'
                    },
                    {
                      key: 'sms_notifications' as keyof NotificationSettings,
                      title: 'SMS notifikationer',
                      description: 'Modtag SMS ved vigtige begivenheder'
                    },
                    {
                      key: 'overdue_alerts' as keyof NotificationSettings,
                      title: 'Forfaldne fakturaer',
                      description: 'Få besked når fakturaer bliver forfaldne'
                    },
                    {
                      key: 'payment_confirmations' as keyof NotificationSettings,
                      title: 'Betalingsbekræftelser',
                      description: 'Modtag besked når betalinger registreres'
                    },
                    {
                      key: 'weekly_reports' as keyof NotificationSettings,
                      title: 'Ugentlige rapporter',
                      description: 'Få en ugentlig sammenfatning af aktivitet'
                    }
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <h4 className="text-sm font-medium text-dark dark:text-white">{setting.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{setting.description}</p>
                      </div>
                      <button
                        onClick={() => handleNotificationChange(setting.key, !notificationSettings[setting.key])}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notificationSettings[setting.key] ? 'bg-primary' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notificationSettings[setting.key] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-dark dark:text-white mb-4">Sikkerhedsindstillinger</h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="text-sm font-medium text-dark dark:text-white mb-2">Skift adgangskode</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Opdater din adgangskode for at holde din konto sikker
                    </p>
                    <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                      Skift Adgangskode
                    </button>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="text-sm font-medium text-dark dark:text-white mb-2">To-faktor autentificering</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Tilføj et ekstra lag af sikkerhed til din konto
                    </p>
                    <button className="px-4 py-2 border border-stroke rounded-lg hover:bg-gray-50 transition-colors">
                      Aktiver 2FA
                    </button>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="text-sm font-medium text-dark dark:text-white mb-2">Aktive sessioner</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Se og administrer dine aktive login-sessioner
                    </p>
                    <button className="px-4 py-2 border border-stroke rounded-lg hover:bg-gray-50 transition-colors">
                      Administrer Sessioner
                    </button>
                  </div>

                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Farezone</h4>
                    <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                      Slet din konto permanent. Denne handling kan ikke fortrydes.
                    </p>
                    <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                      Slet Konto
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
