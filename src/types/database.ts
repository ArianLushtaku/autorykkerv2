// Database types based on actual Supabase schema

export interface Invoice {
  id: string
  user_id: string
  dinero_guid: string
  invoice_number: number
  contact_name: string
  status: string // 'Paid', 'Booked', etc.
  currency: string
  total_incl_vat: number
  total_excl_vat: number
  total_vat: number
  issue_date: string
  payment_date: string | null
  dinero_created_at: string
  dinero_updated_at: string
  mail_out_status: string | null // 'Sent', 'SeenByCustomer', etc.
  latest_mail_out_type: string | null // 'Mailout', 'Reminder', etc.
  raw_details: any
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  updated_at: string | null
  gocardless_token: string | null
  gocardless_refresh_token_encrypted: string | null
  gocardless_token_expires_at: number | null
  gocardless_requisition_id: string | null
  dinero_access_token_encrypted: string | null
  dinero_refresh_token_encrypted: string | null
  dinero_token_expires_at: number | null
  is_gocardless_connected: boolean
  is_dinero_connected: boolean
  dinero_org_id: number | null
}

// Calculated types for dashboard
export interface ProblemCustomer {
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
}

export interface OverdueInvoice {
  id: string
  invoice_number: number
  contact_name: string
  total_incl_vat: number
  issue_date: string
  days_overdue: number
  mail_out_status: string | null
  latest_mail_out_type: string | null
  reminder_count: number
}

export interface PaymentStats {
  total_invoices: number
  total_revenue: number
  average_invoice_value: number
  average_payment_delay: number
  overdue_count: number
  pending_count: number
  paid_count: number
}

export interface CustomerStats {
  contact_name: string
  total_invoices: number
  total_amount: number
  avg_payment_delay: number
  last_payment_date: string | null
  risk_level: 'low' | 'medium' | 'high'
}
