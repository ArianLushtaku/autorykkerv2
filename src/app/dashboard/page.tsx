'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { CreditCard, TrendingUp, Clock, DollarSign, AlertTriangle, FileText, Users, ArrowRight, ChevronRight } from 'lucide-react'
import { RevenueTrends } from './components/Charts/revenue-trends'
import { PaymentBehaviorCard } from './components/PaymentBehaviorCard'
import { Invoice, ProblemCustomer, PaymentStats } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [problemCustomers, setProblemCustomers] = useState<ProblemCustomer[]>([])
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([])
  const [customerBehavior, setCustomerBehavior] = useState({ excellent: 0, good: 0, slow: 0, problem: 0 })
  const [loading, setLoading] = useState(true)

  const TOP_PROBLEM_CUSTOMERS_LIMIT = 5
  const RECENT_INVOICES_LIMIT = 5

  const selectedTimeFrame = searchParams.get('selected_time_frame')
  const revenueTimeFrame = selectedTimeFrame?.split(',').find(param => param.includes('revenue_trends:'))?.split(':')[1] || '6 måneder'

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [statsData, topProblemCustomersData, allProblemCustomersData, customerBehaviorData, recentInvoicesData] = await Promise.all([
        apiClient.getDashboardStats(),
        apiClient.getProblemCustomers(TOP_PROBLEM_CUSTOMERS_LIMIT, 0),
        apiClient.getProblemCustomers(1000, 0),
        apiClient.getCustomerBehavior(),
        apiClient.getRecentInvoices(RECENT_INVOICES_LIMIT)
      ])

      console.log('Dashboard data loaded from optimized SQL views!')

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
        invoice_number: `FAKTURA-${invoice.invoice_number}`,
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
    return new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency: 'DKK'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('da-DK')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Velkommen til Autorykker - Dit overblik over debitorstyring</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/integrationer">
            Administrer integrationer
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Totale Fakturaer</p>
                  <p className="text-3xl font-bold mt-1">{stats.total_invoices.toLocaleString('da-DK')}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-blue-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">
                  {stats.paid_count} betalt
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Omsætning</p>
                  <p className="text-3xl font-bold mt-1">{formatCurrency(stats.total_revenue)}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-muted-foreground">
                <span className="text-green-600 font-medium">↑ Aktiv</span>
                <span className="ml-2">denne måned</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Gns. Betalingstid</p>
                  <p className="text-3xl font-bold mt-1">{Math.round(stats.average_payment_delay)} dage</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20">
                  {stats.overdue_count} forfaldne
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Gns. Fakturaværdi</p>
                  <p className="text-3xl font-bold mt-1">{formatCurrency(stats.average_invoice_value)}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-purple-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 hover:bg-purple-500/20">
                  {stats.pending_count} afventer
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/problemkunder">
          <Card className="hover:shadow-md transition-all hover:border-red-200 cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Problemkunder</h3>
                    <p className="text-sm text-muted-foreground">Se kunder med betalingsudfordringer</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/integrationer">
          <Card className="hover:shadow-md transition-all hover:border-green-200 cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Integrationer</h3>
                    <p className="text-sm text-muted-foreground">Bank og regnskabssystemer</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/automatik/rykkere">
          <Card className="hover:shadow-md transition-all hover:border-blue-200 cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Rykkerautomatik</h3>
                    <p className="text-sm text-muted-foreground">Automatiser dine rykkere</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <RevenueTrends className="xl:col-span-2" timeFrame={revenueTimeFrame} />
        <PaymentBehaviorCard customerBehavior={customerBehavior} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Problem Customers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Top Problemkunder</CardTitle>
              <CardDescription>Kunder med højest risiko score</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/problemkunder">
                Vis alle
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {problemCustomers.length > 0 ? (
              <div className="space-y-3">
                {problemCustomers.slice(0, 5).map((customer, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-sm font-medium">{customer.contact_name?.charAt(0) || '?'}</span>
                      </div>
                      <div>
                        <h4 className="font-medium">{customer.contact_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {customer.invoice_count} fakturaer • {formatCurrency(customer.total_amount)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        customer.risk_score >= 70 ? 'destructive' : 
                        customer.risk_score >= 40 ? 'warning' : 'success'
                      }>
                        Risiko: {customer.risk_score}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {customer.reminder_count + customer.prereminder_count} rykkere
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-muted-foreground">Ingen problemkunder identificeret</p>
                <p className="text-sm text-muted-foreground">Alle kunder betaler til tiden!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Seneste Fakturaer</CardTitle>
              <CardDescription>Dine nyeste fakturaer</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/fakturaer">
                Vis alle
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">#{invoice.invoice_number}</h4>
                      <p className="text-sm text-muted-foreground">{invoice.contact_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(parseFloat(invoice.total_incl_vat?.toString() || '0'))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(invoice.issue_date)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
