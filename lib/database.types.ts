export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          updated_at: string | null
          full_name: string | null
          avatar_url: string | null
          gocardless_token: string | null
          gocardless_refresh_token_encrypted: string | null
          gocardless_token_expires_at: number | null
          gocardless_requisition_id: string | null
          dinero_access_token_encrypted: string | null
          dinero_refresh_token_encrypted: string | null
          dinero_token_expires_at: number | null
          dinero_org_id: number | null
          is_gocardless_connected: boolean | null
          is_dinero_connected: boolean | null
          // Subscription fields
          subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | null
          subscription_plan: 'starter' | 'professional' | 'enterprise' | null
          billing_cycle: 'monthly' | 'yearly' | null
          trial_ends_at: string | null
          subscription_ends_at: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          onboarding_completed: boolean | null
          // Company fields
          company_name: string | null
          cvr: string | null
          address: string | null
          city: string | null
          postal_code: string | null
          phone: string | null
          invoice_email: string | null
        }
        Insert: {
          id: string
          updated_at?: string | null
          full_name?: string | null
          avatar_url?: string | null
          gocardless_token?: string | null
          gocardless_refresh_token_encrypted?: string | null
          gocardless_token_expires_at?: number | null
          gocardless_requisition_id?: string | null
          dinero_access_token_encrypted?: string | null
          dinero_refresh_token_encrypted?: string | null
          dinero_token_expires_at?: number | null
          dinero_org_id?: number | null
          is_gocardless_connected?: boolean | null
          is_dinero_connected?: boolean | null
          // Subscription fields
          subscription_status?: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | null
          subscription_plan?: 'starter' | 'professional' | 'enterprise' | null
          billing_cycle?: 'monthly' | 'yearly' | null
          trial_ends_at?: string | null
          subscription_ends_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          onboarding_completed?: boolean | null
          // Company fields
          company_name?: string | null
          cvr?: string | null
          address?: string | null
          city?: string | null
          postal_code?: string | null
          phone?: string | null
          invoice_email?: string | null
        }
        Update: {
          id?: string
          updated_at?: string | null
          full_name?: string | null
          avatar_url?: string | null
          gocardless_token?: string | null
          gocardless_refresh_token_encrypted?: string | null
          gocardless_token_expires_at?: number | null
          gocardless_requisition_id?: string | null
          dinero_access_token_encrypted?: string | null
          dinero_refresh_token_encrypted?: string | null
          dinero_token_expires_at?: number | null
          dinero_org_id?: number | null
          is_gocardless_connected?: boolean | null
          is_dinero_connected?: boolean | null
          // Subscription fields
          subscription_status?: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | null
          subscription_plan?: 'starter' | 'professional' | 'enterprise' | null
          billing_cycle?: 'monthly' | 'yearly' | null
          trial_ends_at?: string | null
          subscription_ends_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          onboarding_completed?: boolean | null
          // Company fields
          company_name?: string | null
          cvr?: string | null
          address?: string | null
          city?: string | null
          postal_code?: string | null
          phone?: string | null
          invoice_email?: string | null
        }
      }
      invoices: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
          user_id: string
          dinero_guid: string
          invoice_number: number | null
          contact_name: string | null
          status: string | null
          currency: string | null
          total_incl_vat: number | null
          total_excl_vat: number | null
          total_vat: number | null
          issue_date: string | null
          payment_date: string | null
          dinero_created_at: string | null
          dinero_updated_at: string | null
          raw_details: Json | null
          mail_out_status: string | null
          latest_mail_out_type: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
          user_id: string
          dinero_guid: string
          invoice_number?: number | null
          contact_name?: string | null
          status?: string | null
          currency?: string | null
          total_incl_vat?: number | null
          total_excl_vat?: number | null
          total_vat?: number | null
          issue_date?: string | null
          payment_date?: string | null
          dinero_created_at?: string | null
          dinero_updated_at?: string | null
          raw_details?: Json | null
          mail_out_status?: string | null
          latest_mail_out_type?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
          user_id?: string
          dinero_guid?: string
          invoice_number?: number | null
          contact_name?: string | null
          status?: string | null
          currency?: string | null
          total_incl_vat?: number | null
          total_excl_vat?: number | null
          total_vat?: number | null
          issue_date?: string | null
          payment_date?: string | null
          dinero_created_at?: string | null
          dinero_updated_at?: string | null
          raw_details?: Json | null
          mail_out_status?: string | null
          latest_mail_out_type?: string | null
        }
      }
      blog_posts: {
        Row: {
          id: string
          title: string
          slug: string
          excerpt: string | null
          content: string
          hero_image: string | null
          category: string | null
          read_time_minutes: number | null
          published_at: string | null
          is_featured: boolean | null
          seo_title: string | null
          seo_description: string | null
          author_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          excerpt?: string | null
          content: string
          hero_image?: string | null
          category?: string | null
          read_time_minutes?: number | null
          published_at?: string | null
          is_featured?: boolean | null
          seo_title?: string | null
          seo_description?: string | null
          author_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          excerpt?: string | null
          content?: string
          hero_image?: string | null
          category?: string | null
          read_time_minutes?: number | null
          published_at?: string | null
          is_featured?: boolean | null
          seo_title?: string | null
          seo_description?: string | null
          author_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      contact_messages: {
        Row: {
          id: string
          full_name: string
          email: string
          company: string | null
          phone: string | null
          message: string
          source_page: string | null
          created_at: string
          handled: boolean
        }
        Insert: {
          id?: string
          full_name: string
          email: string
          company?: string | null
          phone?: string | null
          message: string
          source_page?: string | null
          created_at?: string
          handled?: boolean
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          company?: string | null
          phone?: string | null
          message?: string
          source_page?: string | null
          created_at?: string
          handled?: boolean
        }
      }
      invoice_reminder_fees: {
        Row: {
          id: string
          user_id: string
          invoice_id: string
          invoice_number: string
          reminder_fee_amount: number | null
          reminder_type: string | null
          reminder_sent_date: string | null
          reminder_due_date: string | null
          total_amount_with_fee: number | null
          last_synced_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          invoice_id: string
          invoice_number: string
          reminder_fee_amount?: number | null
          reminder_type?: string | null
          reminder_sent_date?: string | null
          reminder_due_date?: string | null
          total_amount_with_fee?: number | null
          last_synced_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          invoice_id?: string
          invoice_number?: string
          reminder_fee_amount?: number | null
          reminder_type?: string | null
          reminder_sent_date?: string | null
          reminder_due_date?: string | null
          total_amount_with_fee?: number | null
          last_synced_at?: string | null
          created_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type InvoiceReminderFee = Database['public']['Tables']['invoice_reminder_fees']['Row']
export type BlogPost = Database['public']['Tables']['blog_posts']['Row']
export type ContactMessage = Database['public']['Tables']['contact_messages']['Row']

export type InvoiceStatus = 'Paid' | 'Overdue' | 'Booked' | 'Overpaid'

export interface InvoiceWithProfile extends Invoice {
  profiles?: Profile
}

export interface DashboardStats {
  totalInvoices: number
  totalAmount: number
  paidAmount: number
  overdueAmount: number
  overdueCount: number
  averagePaymentTime: number
}
