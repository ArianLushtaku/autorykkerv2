const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003'

// Token storage keys
const ACCESS_TOKEN_KEY = 'autorykker_access_token'
const REFRESH_TOKEN_KEY = 'autorykker_refresh_token'
const TOKEN_EXPIRES_KEY = 'autorykker_token_expires'

class ApiClient {
  // Store tokens in memory and localStorage
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private tokenExpiresAt: number | null = null

  constructor() {
    // Load tokens from localStorage on init (client-side only)
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
      this.refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
      const expires = localStorage.getItem(TOKEN_EXPIRES_KEY)
      this.tokenExpiresAt = expires ? parseInt(expires) : null
      
      // Debug: log token state on init
      console.log('[API Client] Initialized - token present:', !!this.accessToken, 'expires:', this.tokenExpiresAt)
    }
  }

  // Save session tokens
  setSession(session: { access_token: string; refresh_token: string; expires_at: number }) {
    this.accessToken = session.access_token
    this.refreshToken = session.refresh_token
    this.tokenExpiresAt = session.expires_at

    if (typeof window !== 'undefined') {
      localStorage.setItem(ACCESS_TOKEN_KEY, session.access_token)
      localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token)
      localStorage.setItem(TOKEN_EXPIRES_KEY, session.expires_at.toString())
    }
  }

  // Clear session tokens
  clearSession() {
    this.accessToken = null
    this.refreshToken = null
    this.tokenExpiresAt = null

    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem(TOKEN_EXPIRES_KEY)
    }
  }

  // Check if we have a valid session
  hasValidSession(): boolean {
    if (!this.accessToken || !this.tokenExpiresAt) return false
    // Check if token expires in less than 5 minutes
    return this.tokenExpiresAt > (Date.now() / 1000) + 300
  }

  // Get auth headers, refreshing token if needed
  private async getAuthHeaders(): Promise<HeadersInit> {
    // Try to refresh if token is expired or about to expire
    if (this.refreshToken && this.tokenExpiresAt && this.tokenExpiresAt < (Date.now() / 1000) + 300) {
      try {
        await this.refreshSession()
      } catch (e) {
        console.error('Failed to refresh token:', e)
        this.clearSession()
        throw new Error('Session expired')
      }
    }

    if (!this.accessToken) {
      throw new Error('No authentication token available')
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`
    }
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = await this.getAuthHeaders()
    
    // Debug logging
    if (endpoint === '/auth/check') {
      console.log('[API] Auth check - token present:', !!this.accessToken)
      console.log('[API] Token expires at:', this.tokenExpiresAt, 'now:', Math.floor(Date.now() / 1000))
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[API] Request failed:', endpoint, response.status, errorData)
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  // Dashboard Stats (optimized SQL view)
  async getDashboardStats() {
    return this.makeRequest<{
      total_invoices: number
      total_revenue: number
      average_invoice_value: number
      average_payment_delay: number
      overdue_count: number
      pending_count: number
      paid_count: number
      overdue_amount: number
      pending_amount: number
      paid_amount: number
    }>('/dashboard/stats')
  }

  // Legacy metrics endpoint (kept for compatibility)
  async getDashboardMetrics() {
    return this.makeRequest<{
      total_overdue: number
      total_collected: number
      paid_this_month: number
      awaiting_payment_count: number
    }>('/invoices/metrics')
  }

  // Invoice Lists (using existing endpoints)
  async getAllInvoices(page = 1, pageSize = 100) {
    return this.makeRequest<{
      invoices: Array<any>
      total: number
    }>(`/invoices/all?page=${page}&pageSize=${pageSize}`)
  }

  async getReminderInvoices() {
    return this.makeRequest<Array<any>>('/invoices/reminders')
  }

  async getNeedsActionInvoices() {
    return this.makeRequest<Array<any>>('/invoices/needs_action')
  }

  // Overdue Invoices (optimized SQL view)
  async getOverdueInvoices(page = 1, pageSize = 50) {
    return this.makeRequest<{
      invoices: Array<any>
      total: number
    }>(`/invoices/overdue?page=${page}&pageSize=${pageSize}`)
  }

  // Pending Invoices (optimized SQL view)
  async getPendingInvoices(page = 1, pageSize = 50) {
    return this.makeRequest<{
      invoices: Array<any>
      total: number
    }>(`/invoices/pending?page=${page}&pageSize=${pageSize}`)
  }

  // Recent Invoices (optimized SQL view)
  async getRecentInvoices(limit = 10) {
    return this.makeRequest<{
      invoices: Array<any>
    }>(`/invoices/recent?limit=${limit}`)
  }

  // Customer Behavior (optimized SQL view)
  async getCustomerBehavior() {
    return this.makeRequest<{
      customers: Array<any>
      summary: {
        excellent: number
        good: number
        slow: number
        problem: number
      }
    }>('/customers/behavior')
  }

  // Problem Customers (optimized SQL view)
  async getProblemCustomers(limit = 10, minRiskScore = 20) {
    return this.makeRequest<{
      customers: Array<{
        contact_name: string
        invoice_count: number
        total_amount: number
        overdue_amount: number
        avg_payment_delay: number
        reminder_count: number
        prereminder_count: number
        risk_score: number
        last_invoice_date: string
        status: 'critical' | 'warning' | 'attention'
      }>
    }>(`/customers/problem?limit=${limit}&minRiskScore=${minRiskScore}`)
  }

  // Monthly Revenue (optimized SQL view)
  async getMonthlyRevenue(months: number = 6) {
    return this.makeRequest<{
      data: Array<{
        month: string
        invoice_count: number
        total_revenue: number
        year: number
        month_number: number
      }>
    }>(`/revenue/monthly?months=${months}`)
  }

  // GoCardless Bank Integration
  async getInstitutions(countryCode: string = 'DK') {
    return this.makeRequest<any>(`/institutions?country=${countryCode}`)
  }

  async createGoCardlessAuthLink(institutionId: string, reference: string) {
    return this.makeRequest<{ link: string }>('/create-auth-link', {
      method: 'POST',
      body: JSON.stringify({ institution_id: institutionId, reference })
    })
  }

  async getMyBankAccounts() {
    return this.makeRequest<any>('/get_my_accounts')
  }

  async getBankConnections() {
    return this.makeRequest<{ connections: any[] }>('/gocardless/connections')
  }

  async disconnectGoCardless(connectionId?: string) {
    return this.makeRequest<{ message: string }>('/gocardless/disconnect', {
      method: 'POST',
      body: JSON.stringify(connectionId ? { connection_id: connectionId } : {})
    })
  }

  async getAccountTransactions(accountId: string) {
    return this.makeRequest<any>(`/accounts/${accountId}/transactions`)
  }

  async syncGoCardlessTransactions() {
    return this.makeRequest<{
      success: boolean
      total_synced: number
      total_new: number
      accounts_processed: number
      errors?: string[]
    }>('/gocardless/sync-transactions', {
      method: 'POST'
    })
  }

  // Dinero Integration Methods
  async startDineroAuth() {
    return this.makeRequest<{ auth_url: string }>('/dinero-auth/start')
  }

  async getDineroOrganizations() {
    return this.makeRequest<any>('/dinero/organizations')
  }

  async setDineroOrganization(organizationId: string) {
    return this.makeRequest<{ message: string }>('/profile/organization', {
      method: 'POST',
      body: JSON.stringify({ organization_id: organizationId })
    })
  }

  async syncDineroInvoices(options: { fullSync?: boolean; includeReminders?: boolean } = {}) {
    const { fullSync = false, includeReminders = true } = options
    const params = new URLSearchParams({
      full_sync: String(fullSync),
      include_reminders: String(includeReminders)
    })

    return this.makeRequest<{ message: string }>(`/dinero/sync?${params.toString()}`, {
      method: 'POST'
    })
  }

  async disconnectDinero() {
    return this.makeRequest<{ message: string }>('/dinero/disconnect', {
      method: 'POST'
    })
  }

  async syncReminderFees(fullSync: boolean = false) {
    return this.makeRequest<{ 
      message: string
      stats: {
        total_invoices: number
        synced: number
        failed: number
        no_reminders: number
        duration_seconds: number
      }
    }>(`/dinero/sync-reminder-fees?full_sync=${fullSync}`, {
      method: 'POST'
    })
  }

  // Auth & Subscription Check
  async checkAuthAndSubscription() {
    return this.makeRequest<{
      authenticated: boolean
      user: {
        id: string
        full_name: string | null
        company_name: string | null
        avatar_url: string | null
        is_dinero_connected: boolean
        is_gocardless_connected: boolean
      }
      subscription: {
        status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | null
        plan: 'starter' | 'professional' | 'enterprise' | null
        billing_cycle: 'monthly' | 'yearly' | null
        trial_ends_at: string | null
        trial_valid: boolean
        days_remaining: number | null
      }
      onboarding_completed: boolean
      has_access: boolean
    }>('/auth/check')
  }

  // Complete Onboarding
  async completeOnboarding(data: {
    company_name: string
    cvr?: string
    address?: string
    city?: string
    postal_code?: string
    phone?: string
    invoice_email?: string
    subscription_plan: 'starter' | 'professional' | 'enterprise'
    billing_cycle: 'monthly' | 'yearly'
  }) {
    return this.makeRequest<{
      success: boolean
      message: string
      trial_ends_at: string
    }>('/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  // --- Stripe Methods ---

  async createCheckoutSession(plan: string, billingCycle: string) {
    return this.makeRequest<{
      clientSecret: string
      sessionId: string
    }>('/stripe/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ plan, billing_cycle: billingCycle })
    })
  }

  async getSessionStatus(sessionId: string) {
    return this.makeRequest<{
      status: string
      payment_status: string
      customer_email: string | null
    }>(`/stripe/session-status?session_id=${sessionId}`)
  }

  async getStripePrices() {
    return this.makeRequest<{
      prices: Record<string, string>
    }>('/stripe/prices')
  }

  // --- Auth Methods (no token required) ---
  
  async signup(data: {
    email: string
    password: string
    full_name?: string
    company?: string
  }) {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Signup failed')
    }

    // Save session tokens
    if (result.session) {
      this.setSession(result.session)
    }

    return result as {
      success: boolean
      user: { id: string; email: string }
      session: { access_token: string; refresh_token: string; expires_at: number }
    }
  }

  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Login failed')
    }

    // Save session tokens
    if (result.session) {
      this.setSession(result.session)
    }

    return result as {
      success: boolean
      user: { id: string; email: string }
      session: { access_token: string; refresh_token: string; expires_at: number }
    }
  }

  async refreshSession() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: this.refreshToken })
    })

    const result = await response.json()
    
    if (!response.ok) {
      this.clearSession()
      throw new Error(result.error || 'Token refresh failed')
    }

    // Save new session tokens
    if (result.session) {
      this.setSession(result.session)
    }

    return result
  }

  async logout() {
    try {
      if (this.accessToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          }
        })
      }
    } finally {
      this.clearSession()
    }
  }
}

export const apiClient = new ApiClient()
