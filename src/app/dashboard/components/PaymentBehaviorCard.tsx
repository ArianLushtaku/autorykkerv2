'use client'

import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

interface PaymentBehaviorProps {
  customerBehavior: {
    excellent: number
    good: number
    slow: number
    problem: number
  }
  className?: string
}

export function PaymentBehaviorCard({ customerBehavior, className }: PaymentBehaviorProps) {
  const total = customerBehavior.excellent + customerBehavior.good + customerBehavior.slow + customerBehavior.problem

  const data = [
    {
      category: 'Fremragende Betalere',
      count: customerBehavior.excellent,
      percentage: total > 0 ? (customerBehavior.excellent / total) * 100 : 0,
      color: '#10B981'
    },
    {
      category: 'Gode Betalere',
      count: customerBehavior.good,
      percentage: total > 0 ? (customerBehavior.good / total) * 100 : 0,
      color: '#3B82F6'
    },
    {
      category: 'Langsomme Betalere',
      count: customerBehavior.slow,
      percentage: total > 0 ? (customerBehavior.slow / total) * 100 : 0,
      color: '#F59E0B'
    },
    {
      category: 'Problemkunder',
      count: customerBehavior.problem,
      percentage: total > 0 ? (customerBehavior.problem / total) * 100 : 0,
      color: '#EF4444'
    }
  ]

  const chartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'donut',
      fontFamily: 'Satoshi, sans-serif',
    },
    colors: data.map(item => item.color),
    labels: data.map(item => item.category),
    legend: {
      show: false,
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            total: {
              show: true,
              showAlways: true,
              label: 'Total Kunder',
              fontSize: '14px',
              fontWeight: 600,
              formatter: function () {
                return total.toLocaleString('da-DK')
              }
            }
          }
        }
      }
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      y: {
        formatter: function (val: number) {
          const percentage = ((val / total) * 100).toFixed(1)
          return `${val.toLocaleString('da-DK')} kunder (${percentage}%)`
        }
      }
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          chart: {
            height: 250,
          },
        },
      },
    ],
  }

  const series = data.map(item => item.count)

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <CardTitle>Kundebetalingsadfærd</CardTitle>
        <CardDescription>
          Fordeling af {total.toLocaleString('da-DK')} kunder baseret på betalingsmønstre
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center">
          <Chart
            options={chartOptions}
            series={series}
            type="donut"
            height={280}
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
              <div 
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {item.category}
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.count.toLocaleString('da-DK')} ({item.percentage.toFixed(1)}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
