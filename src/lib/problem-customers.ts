/**
 * Centralized Problem Customers Logic
 * Used across multiple pages: Dashboard, Problemkunder, Risiko
 */

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

export function calculateProblemCustomers(allInvoices: any[]): ProblemCustomer[] {
  // Group invoices by customer
  const customerMap = new Map<string, any>()
  
  allInvoices.forEach(invoice => {
    const customerName = invoice.contact_name
    if (!customerName) return
    
    const customer = customerMap.get(customerName) || {
      contact_name: customerName,
      invoices: [],
      total_amount: 0,
      overdue_amount: 0,
      payment_delays: [],
      reminder_count: 0,
      prereminder_count: 0,
      last_invoice_date: invoice.issue_date
    }
    
    customer.invoices.push(invoice)
    
    const amount = parseFloat(invoice.total_incl_vat)
    if (!isNaN(amount)) {
      customer.total_amount += amount
    }
    
    // Check if overdue
    if (invoice.status === 'Overdue') {
      customer.overdue_amount += amount
    }
    
    // Count reminders
    if (invoice.latest_mail_out_type === 'Reminder') {
      customer.reminder_count++
    } else if (invoice.latest_mail_out_type === 'PreReminder') {
      customer.prereminder_count++
    }
    
    // Calculate payment delay for paid invoices
    if ((invoice.status === 'Paid' || invoice.status === 'Overpaid') && 
        invoice.dinero_updated_at && invoice.issue_date) {
      const paymentDate = new Date(invoice.dinero_updated_at)
      const issueDate = new Date(invoice.issue_date)
      const delay = Math.floor((paymentDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24))
      if (delay > 0) {
        customer.payment_delays.push(delay)
      }
    }
    
    // Track latest invoice date
    if (invoice.issue_date > customer.last_invoice_date) {
      customer.last_invoice_date = invoice.issue_date
    }
    
    customerMap.set(customerName, customer)
  })
  
  // Convert to problem customers array with risk scoring
  const problemCustomers: ProblemCustomer[] = []
  
  customerMap.forEach(customer => {
    // Only include customers with multiple invoices or issues
    if (customer.invoices.length < 2 && customer.overdue_amount === 0) return
    
    // Calculate average payment delay
    const avgDelay = customer.payment_delays.length > 0
      ? customer.payment_delays.reduce((sum: number, d: number) => sum + d, 0) / customer.payment_delays.length
      : 0
    
    // Calculate risk score (0-100)
    let riskScore = 0
    
    // Factor 1: Overdue amount (0-40 points)
    if (customer.overdue_amount > 0) {
      riskScore += Math.min(40, (customer.overdue_amount / customer.total_amount) * 40)
    }
    
    // Factor 2: Reminder count (0-30 points)
    const reminderRate = (customer.reminder_count + customer.prereminder_count) / customer.invoices.length
    riskScore += reminderRate * 30
    
    // Factor 3: Payment delay (0-30 points)
    if (avgDelay > 0) {
      riskScore += Math.min(30, (avgDelay / 30) * 30) // 30+ days = max points
    }
    
    // Determine status based on risk score
    let status: 'critical' | 'warning' | 'attention' = 'attention'
    if (riskScore >= 60) status = 'critical'
    else if (riskScore >= 30) status = 'warning'
    
    // Only include if risk score is above threshold
    if (riskScore >= 20) {
      problemCustomers.push({
        contact_name: customer.contact_name,
        invoice_count: customer.invoices.length,
        total_amount: customer.total_amount,
        overdue_amount: customer.overdue_amount,
        avg_payment_delay: Math.round(avgDelay * 10) / 10,
        reminder_count: customer.reminder_count,
        prereminder_count: customer.prereminder_count,
        risk_score: Math.round(riskScore),
        last_invoice_date: customer.last_invoice_date,
        status
      })
    }
  })
  
  // Sort by risk score descending
  return problemCustomers.sort((a, b) => b.risk_score - a.risk_score)
}

export function getTopProblemCustomers(allInvoices: any[], limit: number = 5): ProblemCustomer[] {
  const problemCustomers = calculateProblemCustomers(allInvoices)
  return problemCustomers.slice(0, limit)
}
