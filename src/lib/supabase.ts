import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key-here'

// For client-side usage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // Suppress OAuth errors when session expires
    debug: false,
    // Keep session alive - refresh token before it expires
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'autorykker-auth-token',
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'x-client-info': 'autorykker-web',
    },
  },
})

// Handle auth state changes and errors gracefully
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Session refreshed successfully')
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out')
  } else if (event === 'USER_UPDATED') {
    console.log('User updated')
  }
})

// Helper functions for dashboard data
export async function getDashboardStats(userId: string) {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error

  const stats = {
    totalInvoices: invoices.length,
    totalAmount: invoices.reduce((sum, inv) => sum + (inv.total_incl_vat || 0), 0),
    paidAmount: invoices
      .filter(inv => inv.status === 'Paid')
      .reduce((sum, inv) => sum + (inv.total_incl_vat || 0), 0),
    overdueAmount: invoices
      .filter(inv => inv.status === 'Overdue')
      .reduce((sum, inv) => sum + (inv.total_incl_vat || 0), 0),
    overdueCount: invoices.filter(inv => inv.status === 'Overdue').length,
    averagePaymentTime: 0 // TODO: Calculate based on issue_date and payment_date
  }

  return stats
}
