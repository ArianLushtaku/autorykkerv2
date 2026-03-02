'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { RevenueTrendsChart } from './chart'
import { PeriodPicker } from '@/components/period-picker'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

type PropsType = {
  timeFrame?: string
  className?: string
}

interface RevenueData {
  month: string
  revenue: number
  invoices: number
}

export function RevenueTrends({ className, timeFrame = "6 måneder" }: PropsType) {
  const [data, setData] = useState<RevenueData[]>([])
  const [loading, setLoading] = useState(true)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalInvoices, setTotalInvoices] = useState(0)

  useEffect(() => {
    fetchRevenueData()
  }, [timeFrame])

  const fetchRevenueData = async () => {
    setLoading(true)
    try {
      // Map timeFrame to months
      let months = 6
      
      if (timeFrame === "Alle") {
        months = 0 // 0 means all data
      } else if (timeFrame === "12 måneder") {
        months = 12
      } else if (timeFrame === "6 måneder") {
        months = 6
      } else if (timeFrame === "3 måneder") {
        months = 3
      }
      
      // Fetch from optimized SQL view - SUPER FAST!
      const response = await apiClient.getMonthlyRevenue(months)
      
      if (response.data && response.data.length > 0) {
        // Format data for chart (reverse to show oldest to newest)
        const chartData = response.data
          .reverse()
          .map(item => ({
            month: new Date(item.month).toLocaleDateString('da-DK', { 
              month: 'short', 
              year: 'numeric' 
            }),
            revenue: item.total_revenue,
            invoices: item.invoice_count
          }))

        setData(chartData)
        setTotalRevenue(chartData.reduce((sum, item) => sum + item.revenue, 0))
        setTotalInvoices(chartData.reduce((sum, item) => sum + item.invoices, 0))
      } else {
        setData([])
        setTotalRevenue(0)
        setTotalInvoices(0)
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error)
      setData([])
      setTotalRevenue(0)
      setTotalInvoices(0)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency: 'DKK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Omsætningsudvikling</CardTitle>
          <CardDescription>Omsætning og fakturaer over tid</CardDescription>
        </div>
        <PeriodPicker
          items={["Alle", "12 måneder", "6 måneder", "3 måneder"]}
          defaultValue={timeFrame}
          sectionKey="revenue_trends"
        />
      </CardHeader>
      <CardContent>
        <RevenueTrendsChart data={data} />

        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
            <p className="text-sm text-muted-foreground">Total Omsætning</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{totalInvoices.toLocaleString('da-DK')}</p>
            <p className="text-sm text-muted-foreground">Antal Fakturaer</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
