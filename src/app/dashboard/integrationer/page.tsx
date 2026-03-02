'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { apiClient } from '@/lib/api-client'
import { CreditCard, RefreshCw, CheckCircle, AlertCircle, Settings, Link, Unlink, Building2, Landmark } from 'lucide-react'

interface BankConnection {
  id: string
  bank_name: string
  account_number: string
  is_connected: boolean
  last_sync: string | null
  sync_status: 'success' | 'error' | 'pending'
  transactions_synced: number
}

interface PaymentMatch {
  id: string
  transaction_id: string
  invoice_number: string
  customer_name: string
  amount: number
  transaction_date: string
  confidence: number
  status: 'matched' | 'pending' | 'manual_review'
}

interface BankTransaction {
  id: string
  transaction_id: string
  booking_date: string
  value_date: string | null
  amount: number
  currency: string
  debtor_name: string | null
  remittance_information: string | null
  additional_information: string | null
  created_at: string
}

interface Institution {
  id: string
  name: string
  logo: string
  bic: string
  countries: string[]
}

export default function IntegrationPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState<'bank' | 'regnskab'>('bank')
  const [connections, setConnections] = useState<BankConnection[]>([])
  const [matches, setMatches] = useState<PaymentMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [showBankSelector, setShowBankSelector] = useState(false)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loadingInstitutions, setLoadingInstitutions] = useState(false)
  const [bankSearchQuery, setBankSearchQuery] = useState('')
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [showAllTransactions, setShowAllTransactions] = useState(false)
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  
  // Dinero state
  const [dineroConnected, setDineroConnected] = useState(false)
  const [dineroOrganizations, setDineroOrganizations] = useState<any[]>([])
  const [selectedOrganization, setSelectedOrganization] = useState<string | null>(null)
  const [syncingDineroInvoices, setSyncingDineroInvoices] = useState(false)
  const [syncingDineroReminders, setSyncingDineroReminders] = useState(false)

  // Get tab from URL or default to 'bank'
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'regnskab' || tab === 'bank') {
      setActiveTab(tab)
    }

    // Check if Dinero was just connected
    const success = searchParams.get('success')
    if (success === 'dinero_connected') {
      setActiveTab('regnskab')
      // Refresh data to get Dinero connection status
      fetchData()
    }
  }, [searchParams])

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (connections.length > 0) {
      fetchTransactions()
      fetchPaymentMatches()
    }
  }, [connections.length, showAllTransactions])

  const fetchData = async () => {
    try {
      // Fetch all bank connections
      const { connections: bankConnections } = await apiClient.getBankConnections()
      
      if (bankConnections && bankConnections.length > 0) {
        const formattedConnections: BankConnection[] = bankConnections.map((conn: any) => ({
          id: conn.id,
          bank_name: conn.institution_name || conn.institution_id || 'Bank',
          account_number: conn.account_ids?.[0]?.substring(0, 8) + '****' || '****',
          is_connected: conn.status === 'active',
          last_sync: conn.last_sync_at || conn.connected_at,
          sync_status: 'success' as const,
          transactions_synced: conn.account_ids?.length || 0
        }))
        
        setConnections(formattedConnections)
      }

      // Check Dinero connection status using backend API (which has the correct auth)
      try {
        const authResult = await apiClient.checkAuthAndSubscription()
        if (authResult.authenticated && authResult.user.is_dinero_connected) {
          setDineroConnected(true)
          // Fetch organizations if connected
          await fetchDineroOrganizations()
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

  const fetchPaymentMatches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch payment matches with related transaction and invoice data
      const { data, error } = await supabase
        .from('payment_matches')
        .select(`
          id,
          confidence_score,
          status,
          matched_at,
          transaction_id,
          invoice_id,
          bank_transactions!inner (
            id,
            amount,
            booking_date,
            debtor_name,
            creditor_name
          ),
          invoices!inner (
            invoice_number,
            contact_name
          )
        `)
        .eq('user_id', user.id)
        .order('matched_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching payment matches:', error)
        return
      }

      // Transform the data to match our interface
      const formattedMatches: PaymentMatch[] = (data || []).map((match: any) => ({
        id: match.id,
        transaction_id: match.bank_transactions?.id || 'N/A',
        invoice_number: match.invoices?.invoice_number?.toString() || 'N/A',
        customer_name: match.invoices?.contact_name || match.bank_transactions?.debtor_name || match.bank_transactions?.creditor_name || 'Ukendt',
        amount: Number(match.bank_transactions?.amount || 0),
        transaction_date: match.bank_transactions?.booking_date || match.matched_at,
        confidence: Math.round(Number(match.confidence_score || 0)),
        status: match.status === 'confirmed' ? 'matched' : 
                match.status === 'pending' ? 'pending' : 'manual_review'
      }))

      setMatches(formattedMatches)
    } catch (error) {
      console.error('Error fetching payment matches:', error)
    }
  }

  const fetchTransactions = async () => {
    setLoadingTransactions(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const limit = showAllTransactions ? 100 : 10
      const { data, error } = await supabase
        .from('bank_transactions')
        .select('*')
        .eq('user_id', user.id)
        .gt('amount', 0)  // Only positive amounts (incoming payments)
        .order('booking_date', { ascending: false })
        .limit(limit)

      if (error) throw error

      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoadingTransactions(false)
    }
  }

  const handleSync = async (connectionId: string) => {
    setSyncing(true)
    try {
      // Call the real sync endpoint
      const result = await apiClient.syncGoCardlessTransactions()
      
      console.log('Sync result:', result)
      
      setConnections(prev => prev.map(conn => 
        conn.id === connectionId 
          ? { ...conn, last_sync: new Date().toISOString(), sync_status: 'success' as const }
          : conn
      ))
      
      // Refresh transactions and payment matches after sync
      await fetchTransactions()
      await fetchPaymentMatches()
      
      // Show detailed feedback
      if (result.total_new > 0) {
        alert(`Synkroniseret! ${result.total_new} nye transaktioner fundet.`)
      } else if (result.latest_transaction_date) {
        const latestDate = new Date(result.latest_transaction_date).toLocaleDateString('da-DK')
        alert(`Synkronisering fuldført. Ingen nye transaktioner.\n\nSeneste transaktion i databasen: ${latestDate}\n\nDin bank har ikke nye transaktioner siden sidste synkronisering.`)
      } else {
        alert('Synkronisering fuldført. Ingen transaktioner fundet.')
      }
    } catch (error) {
      console.error('Error syncing transactions:', error)
      alert('Kunne ikke synkronisere transaktioner. Prøv igen.')
    } finally {
      setSyncing(false)
    }
  }

  const fetchInstitutions = async () => {
    setLoadingInstitutions(true)
    try {
      const data = await apiClient.getInstitutions('DK') // Danish banks
      setInstitutions(data)
    } catch (error) {
      console.error('Error fetching institutions:', error)
      alert('Kunne ikke hente bankliste. Prøv igen senere.')
    } finally {
      setLoadingInstitutions(false)
    }
  }

  const handleConnect = async () => {
    // Show bank selector modal
    setShowBankSelector(true)
    await fetchInstitutions()
  }

  const handleBankSelect = async (institutionId: string) => {
    try {
      setShowBankSelector(false)
      const reference = `user_${Date.now()}`
      
      const response = await apiClient.createGoCardlessAuthLink(institutionId, reference)
      
      if (response.link) {
        // Redirect user to GoCardless auth page
        window.location.href = response.link
      }
    } catch (error) {
      console.error('Error creating auth link:', error)
      alert('Kunne ikke oprette bankforbindelse. Prøv igen senere.')
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Er du sikker på at du vil afbryde forbindelsen til din bank?')) {
      return
    }

    try {
      await apiClient.disconnectGoCardless()
      setConnections([])
      alert('Bankforbindelse afbrudt')
    } catch (error) {
      console.error('Error disconnecting:', error)
      alert('Kunne ikke afbryde forbindelsen. Prøv igen senere.')
    }
  }

  // Dinero Functions
  const handleDineroConnect = async () => {
    try {
      const { auth_url } = await apiClient.startDineroAuth()
      window.location.href = auth_url
    } catch (error) {
      console.error('Error starting Dinero auth:', error)
      alert('Kunne ikke starte Dinero forbindelse. Prøv igen senere.')
    }
  }

  const fetchDineroOrganizations = async () => {
    try {
      const orgs = await apiClient.getDineroOrganizations()
      setDineroOrganizations(orgs)
      
      // If only one organization and none selected, automatically select it
      if (orgs.length === 1 && !selectedOrganization) {
        setSelectedOrganization(orgs[0].Id)
        await apiClient.setDineroOrganization(orgs[0].Id)
        alert('Organisation valgt: ' + orgs[0].Name)
      } else if (orgs.length > 0) {
        // Set the first org as selected if none is set
        setSelectedOrganization(orgs[0].Id)
      }
    } catch (error) {
      console.error('Error fetching Dinero organizations:', error)
      alert('Kunne ikke hente organisationer. Prøv at genindlæse siden.')
    }
  }

  const handleDineroInvoiceSync = async () => {
    if (!selectedOrganization) {
      alert('Vælg venligst en organisation før synkronisering')
      return
    }

    setSyncingDineroInvoices(true)
    try {
      const result = await apiClient.syncDineroInvoices({ fullSync: false, includeReminders: false })
      alert(result.message || 'Fakturaer og kunder synkroniseret!')
    } catch (error) {
      console.error('Error syncing Dinero invoices:', error)
      alert('Kunne ikke synkronisere fakturaer. Prøv igen senere.')
    } finally {
      setSyncingDineroInvoices(false)
    }
  }

  const handleDineroReminderSync = async (fullSync: boolean = false) => {
    if (!selectedOrganization) {
      alert('Vælg venligst en organisation før synkronisering')
      return
    }

    setSyncingDineroReminders(true)
    try {
      const result = await apiClient.syncReminderFees(fullSync)
      alert(result.message || 'Rykkere synkroniseret!')
    } catch (error) {
      console.error('Error syncing Dinero reminders:', error)
      alert('Kunne ikke synkronisere rykkere. Prøv igen senere.')
    } finally {
      setSyncingDineroReminders(false)
    }
  }

  const handleDineroDisconnect = async () => {
    if (!confirm('Er du sikker på at du vil afbryde forbindelsen til Dinero?')) {
      return
    }

    try {
      await apiClient.disconnectDinero()
      setDineroConnected(false)
      setDineroOrganizations([])
      setSelectedOrganization(null)
      alert('Dinero forbindelse afbrudt')
    } catch (error) {
      console.error('Error disconnecting Dinero:', error)
      alert('Kunne ikke afbryde forbindelsen. Prøv igen senere.')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency: 'DKK'
    }).format(amount)
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('da-DK')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100'
      case 'error': return 'text-red-600 bg-red-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case 'matched': return 'text-green-600 bg-green-100'
      case 'pending': return 'text-blue-600 bg-blue-100'
      case 'manual_review': return 'text-orange-600 bg-orange-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600'
    if (confidence >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const handleTabChange = (tab: 'bank' | 'regnskab') => {
    setActiveTab(tab)
    router.push(`${pathname}?tab=${tab}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark dark:text-white mb-2">Integrationer</h1>
        <p className="text-gray-600 dark:text-gray-400">Tilslut bank og regnskabssystemer</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-stroke dark:border-dark-3">
        <div className="flex gap-8">
          <button
            onClick={() => handleTabChange('bank')}
            className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'bank'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-dark dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              <span>Bank</span>
            </div>
          </button>
          <button
            onClick={() => handleTabChange('regnskab')}
            className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'regnskab'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-dark dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <span>Regnskabsprogram</span>
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'bank' && (
        <div className="space-y-6">{/* Bank Integration Content */}

      {/* Stats */}
      {matches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-dark p-6 rounded-lg shadow-sm border-l-4 border-green-500">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Automatisk Matchet</p>
                <p className="text-2xl font-bold text-dark dark:text-white">
                  {matches.filter(m => m.status === 'matched').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-dark p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
            <div className="flex items-center">
              <RefreshCw className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Afventer Godkendelse</p>
                <p className="text-2xl font-bold text-dark dark:text-white">
                  {matches.filter(m => m.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-dark p-6 rounded-lg shadow-sm border-l-4 border-orange-500">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Manuel Gennemgang</p>
                <p className="text-2xl font-bold text-dark dark:text-white">
                  {matches.filter(m => m.status === 'manual_review').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-dark p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Matchet</p>
                <p className="text-2xl font-bold text-dark dark:text-white">
                  {formatCurrency(matches.reduce((acc, m) => acc + m.amount, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bank Connections */}
      <div className="bg-white dark:bg-gray-dark rounded-lg shadow-sm">
        <div className="p-6 border-b border-stroke flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-dark dark:text-white">Bankforbindelser</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Administrer dine bankkonti og synkronisering</p>
          </div>
          {connections.length === 0 && (
            <button
              onClick={handleConnect}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Link className="h-4 w-4" />
              Tilslut Bank
            </button>
          )}
        </div>

        {connections.length === 0 ? (
          <div className="p-12 text-center">
            <Landmark className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">
              Ingen bankforbindelser
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Tilslut din bank for automatisk betalingsmatch
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stroke">
            {connections.map((connection) => (
            <div key={connection.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-primary" />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-dark dark:text-white">{connection.bank_name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Konto: {connection.account_number}</p>
                    {connection.last_sync && (
                      <p className="text-xs text-gray-500">
                        Sidst synkroniseret: {formatDateTime(connection.last_sync)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(connection.sync_status)}`}>
                    {connection.is_connected ? 'Tilsluttet' : 'Ikke tilsluttet'}
                  </span>
                  
                  {connection.is_connected ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSync(connection.id)}
                        disabled={syncing}
                        className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Synkroniserer...' : 'Synkroniser'}
                      </button>
                      <button
                        onClick={handleDisconnect}
                        className="flex items-center gap-2 px-3 py-2 border border-stroke rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Unlink className="h-4 w-4" />
                        Afbryd
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleConnect}
                      className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <Link className="h-4 w-4" />
                      Tilslut
                    </button>
                  )}
                </div>
              </div>

              {connection.is_connected && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Transaktioner synkroniseret</p>
                    <p className="text-lg font-semibold text-dark dark:text-white">{connection.transactions_synced}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                    <p className="text-lg font-semibold text-green-600">Aktiv</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Automatisk sync</p>
                    <p className="text-lg font-semibold text-dark dark:text-white">Hver time</p>
                  </div>
                </div>
              )}
            </div>
          ))}
          </div>
        )}

        {connections.length > 0 && (
          <div className="p-6 border-t border-stroke">
            <button 
              onClick={handleConnect}
              className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
            >
              <div className="w-5 h-5 border-2 border-primary rounded flex items-center justify-center">
                <span className="text-xs">+</span>
              </div>
              Tilføj Bankkonto
            </button>
          </div>
        )}
      </div>

      {/* Payment Matches */}
      <div className="bg-white dark:bg-gray-dark rounded-lg shadow-sm">
        <div className="p-6 border-b border-stroke">
          <h2 className="text-lg font-semibold text-dark dark:text-white">Betalingsmatch</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Automatisk matching af indgående betalinger</p>
        </div>

        {matches.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">
              Ingen betalingsmatch endnu
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Betalinger vil automatisk blive matchet med fakturaer når de synkroniseres
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaktion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Faktura
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kunde
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Beløb
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sikkerhed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Handlinger
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-dark divide-y divide-gray-200 dark:divide-gray-700">
              {matches.map((match) => (
                <tr key={match.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-dark dark:text-white">
                    {match.transaction_id}
                    <div className="text-xs text-gray-500">{formatDateTime(match.transaction_date)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {match.invoice_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {match.customer_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-dark dark:text-white">
                    {formatCurrency(match.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-bold ${getConfidenceColor(match.confidence)}`}>
                      {match.confidence}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMatchStatusColor(match.status)}`}>
                      {match.status === 'matched' ? 'Matchet' : 
                       match.status === 'pending' ? 'Afventer' : 'Manuel Gennemgang'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {match.status === 'pending' && (
                      <div className="flex gap-2 justify-end">
                        <button className="text-green-600 hover:text-green-900">Godkend</button>
                        <button className="text-red-600 hover:text-red-900">Afvis</button>
                      </div>
                    )}
                    {match.status === 'manual_review' && (
                      <button className="text-primary hover:text-primary/80">Gennemgå</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Recent Transactions - Collapsible Section */}
      {connections.length > 0 && (
        <div className="bg-white dark:bg-gray-dark rounded-lg shadow-sm">
          <button
            onClick={() => setShowAllTransactions(!showAllTransactions)}
            className="w-full p-6 border-b border-stroke flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div>
              <h2 className="text-lg font-semibold text-dark dark:text-white text-left">Indgående Betalinger</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-left">
                {showAllTransactions ? 'Viser op til 100 indgående betalinger' : 'Viser seneste 10 indgående betalinger'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-primary font-medium">
                {showAllTransactions ? 'Vis færre' : 'Vis alle'}
              </span>
              <svg
                className={`w-5 h-5 text-primary transition-transform ${showAllTransactions ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {loadingTransactions ? (
            <div className="p-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Ingen indgående betalinger fundet</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Kun positive beløb vises (indgående betalinger)</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction ID
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Booking Date
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value Date
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Currency
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Debtor Name
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remittance Info
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Additional Info
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-dark divide-y divide-gray-200 dark:divide-gray-700">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-300 font-mono">
                        <div className="max-w-[120px] truncate" title={transaction.transaction_id}>
                          {transaction.transaction_id.substring(0, 12)}...
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">
                        {new Date(transaction.booking_date).toLocaleDateString('da-DK')}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">
                        {transaction.value_date ? new Date(transaction.value_date).toLocaleDateString('da-DK') : '-'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right text-xs font-medium text-green-600">
                        {formatCurrency(Number(transaction.amount))}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">
                        {transaction.currency}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-300">
                        <div className="max-w-[200px] truncate" title={transaction.debtor_name || ''}>
                          {transaction.debtor_name || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-300">
                        <div className="max-w-[250px] truncate" title={transaction.remittance_information || ''}>
                          {transaction.remittance_information || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-300">
                        <div className="max-w-[200px] truncate" title={transaction.additional_information || ''}>
                          {transaction.additional_information || '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
        </div>
      )}

      {/* Regnskabsprogram Tab */}
      {activeTab === 'regnskab' && (
        <div className="space-y-6">
          {!dineroConnected ? (
            <div className="bg-white dark:bg-gray-dark p-8 rounded-lg shadow-sm text-center">
              <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-dark dark:text-white mb-2">
                Tilslut dit regnskabssystem
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Synkroniser fakturaer automatisk fra Dinero, Billy eller andre danske regnskabssystemer
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <button 
                  onClick={handleDineroConnect}
                  className="p-6 border-2 border-stroke dark:border-dark-3 rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <div className="text-2xl font-bold mb-2">Dinero</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tilslut Dinero regnskabssystem</p>
                </button>
                <div className="p-6 border-2 border-stroke dark:border-dark-3 rounded-lg opacity-50 cursor-not-allowed relative">
                  <div className="text-2xl font-bold mb-2 line-through">Billy</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tilslut Billy regnskabssystem</p>
                  <span className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded">
                    Kommer Snart!
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-dark rounded-lg shadow-sm">
              <div className="p-6 border-b border-stroke dark:border-dark-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-dark dark:text-white">Dinero</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Fakturaer og kunder synkroniseres automatisk ved behov. Rykkere kan synkroniseres separat.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDineroInvoiceSync}
                        disabled={syncingDineroInvoices}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${syncingDineroInvoices ? 'animate-spin' : ''}`} />
                        {syncingDineroInvoices ? 'Synkroniserer...' : 'Synkroniser Fakturaer & Kunder'}
                      </button>
                      <button
                        onClick={() => handleDineroReminderSync(false)}
                        disabled={syncingDineroReminders}
                        className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${syncingDineroReminders ? 'animate-spin' : ''}`} />
                        {syncingDineroReminders ? 'Synkroniserer...' : 'Synkroniser Rykkere'}
                      </button>
                    </div>
                    <button
                      onClick={handleDineroDisconnect}
                      className="px-4 py-2 border border-stroke dark:border-dark-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
                    >
                      <Unlink className="h-4 w-4" />
                      Afbryd
                    </button>
                  </div>
                </div>
              </div>

              {/* Organization Selector */}
              {dineroOrganizations.length > 0 && (
                <div className="p-6 border-b border-stroke dark:border-dark-3">
                  <label className="block text-sm font-medium text-dark dark:text-white mb-2">
                    Organisation {!selectedOrganization && <span className="text-red-600">*</span>}
                  </label>
                  <select
                    value={selectedOrganization || ''}
                    onChange={async (e) => {
                      const orgId = e.target.value
                      setSelectedOrganization(orgId)
                      try {
                        await apiClient.setDineroOrganization(orgId)
                        const orgName = dineroOrganizations.find(org => org.Id === orgId)?.Name
                        alert(`Organisation valgt: ${orgName}`)
                      } catch (error) {
                        console.error('Error setting organization:', error)
                        alert('Kunne ikke gemme organisation')
                      }
                    }}
                    className="w-full px-4 py-2 border border-stroke dark:border-dark-3 rounded-lg bg-white dark:bg-gray-dark text-dark dark:text-white"
                  >
                    {!selectedOrganization && (
                      <option value="">Vælg organisation...</option>
                    )}
                    {dineroOrganizations.map(org => (
                      <option key={org.Id} value={org.Id}>
                        {org.Name}
                      </option>
                    ))}
                  </select>
                  {!selectedOrganization && (
                    <p className="text-xs text-red-600 mt-1">
                      Du skal vælge en organisation før du kan synkronisere fakturaer
                    </p>
                  )}
                </div>
              )}

              <div className="p-6">
                <div className="flex items-center gap-2 text-green-600 mb-4">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Dinero er tilsluttet</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedOrganization 
                    ? 'Dine fakturaer synkroniseres automatisk fra Dinero. Klik på "Synkroniser" for at hente de seneste fakturaer.'
                    : 'Vælg din organisation ovenfor for at begynde at synkronisere fakturaer.'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bank Selector Modal */}
      {showBankSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-dark rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-stroke dark:border-dark-3">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-dark dark:text-white">Vælg din bank</h2>
                <button
                  onClick={() => {
                    setShowBankSelector(false)
                    setBankSearchQuery('')
                  }}
                  className="text-gray-500 hover:text-dark dark:hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              {/* Search Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Søg efter bank..."
                  value={bankSearchQuery}
                  onChange={(e) => setBankSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-stroke dark:border-dark-3 rounded-lg bg-white dark:bg-gray-dark text-dark dark:text-white focus:outline-none focus:border-primary"
                />
                <svg
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingInstitutions ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {institutions
                    .filter((institution) =>
                      institution.name.toLowerCase().includes(bankSearchQuery.toLowerCase()) ||
                      institution.bic?.toLowerCase().includes(bankSearchQuery.toLowerCase())
                    )
                    .map((institution) => (
                      <button
                        key={institution.id}
                        onClick={() => handleBankSelect(institution.id)}
                        className="p-4 border-2 border-stroke dark:border-dark-3 rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          {institution.logo && (
                            <img src={institution.logo} alt={institution.name} className="w-12 h-12 object-contain" />
                          )}
                          <div>
                            <div className="font-semibold text-dark dark:text-white">{institution.name}</div>
                            {institution.bic && (
                              <div className="text-xs text-gray-500">{institution.bic}</div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              )}
              
              {/* No Results Message */}
              {!loadingInstitutions && institutions.filter((institution) =>
                institution.name.toLowerCase().includes(bankSearchQuery.toLowerCase()) ||
                institution.bic?.toLowerCase().includes(bankSearchQuery.toLowerCase())
              ).length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  Ingen banker fundet for "{bankSearchQuery}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
