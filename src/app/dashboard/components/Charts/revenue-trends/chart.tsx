"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

type PropsType = {
  data: {
    month: string;
    revenue: number;
    invoices: number;
  }[];
};

const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export function RevenueTrendsChart({ data }: PropsType) {
  const isMobile = useIsMobile();

  const options: ApexOptions = {
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '14px',
      fontWeight: 500,
      itemMargin: {
        horizontal: 12,
      },
    },
    colors: ["#10B981", "#3B82F6"],
    chart: {
      height: 350,
      type: "area",
      toolbar: {
        show: false,
      },
      fontFamily: "Satoshi, sans-serif",
      zoom: {
        enabled: false,
      },
      animations: {
        enabled: true,
        speed: 800,
      },
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.3,
        opacityFrom: 0.7,
        opacityTo: 0.1,
        stops: [0, 90, 100]
      },
    },
    responsive: [
      {
        breakpoint: 1024,
        options: {
          chart: {
            height: 300,
          },
        },
      },
      {
        breakpoint: 1366,
        options: {
          chart: {
            height: 350,
          },
        },
      },
    ],
    stroke: {
      curve: "smooth",
      width: [3, 2],
      dashArray: [0, 0],
    },
    grid: {
      borderColor: '#E5E7EB',
      strokeDashArray: 4,
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 10,
      },
    },
    dataLabels: {
      enabled: false,
    },
    markers: {
      size: 0,
      hover: {
        size: 6,
        sizeOffset: 3,
      },
    },
    tooltip: {
      marker: {
        show: true,
      },
      y: {
        formatter: function (val: number, opts: any) {
          if (opts.seriesIndex === 0) {
            return new Intl.NumberFormat('da-DK', {
              style: 'currency',
              currency: 'DKK',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(val);
          } else {
            return val.toLocaleString('da-DK') + ' fakturaer';
          }
        }
      }
    },
    xaxis: {
      categories: data.map(item => item.month),
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: [
      {
        title: {
          text: 'Omsætning (DKK)',
          style: {
            color: '#10B981'
          }
        },
        labels: {
          formatter: function (val: number) {
            return new Intl.NumberFormat('da-DK', {
              style: 'currency',
              currency: 'DKK',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
              notation: 'compact'
            }).format(val);
          }
        }
      },
      {
        opposite: true,
        title: {
          text: 'Antal Fakturaer',
          style: {
            color: '#3B82F6'
          }
        },
        labels: {
          formatter: function (val: number) {
            return val.toLocaleString('da-DK');
          }
        }
      }
    ]
  };

  const series = [
    {
      name: "Omsætning",
      type: "area",
      data: data.map(item => item.revenue),
    },
    {
      name: "Antal Fakturaer",
      type: "line",
      data: data.map(item => item.invoices),
    }
  ];

  return (
    <div className="-ml-4 -mr-5 h-[350px]">
      <Chart
        options={options}
        series={series}
        type="line"
        height={350}
      />
    </div>
  );
}
