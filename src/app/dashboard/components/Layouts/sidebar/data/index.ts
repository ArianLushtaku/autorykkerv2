import * as Icons from "../icons";

export const NAV_DATA = [
  {
    label: "HOVEDMENU",
    items: [
      {
        title: "Dashboard",
        icon: Icons.HomeIcon,
        items: [
          {
            title: "Oversigt",
            url: "/dashboard",
          },
        ],
      },
      // MVP: Focus on problem customers and payment tracking
      {
        title: "Problemkunder",
        icon: Icons.AlertTriangle,
        items: [
          {
            title: "Sene Betalere",
            url: "/dashboard/problemkunder",
          },
          // Temporarily hidden - keeping code for later
          // {
          //   title: "Risikokunder",
          //   url: "/dashboard/problemkunder/risiko",
          // },
        ],
      },
      // Temporarily hidden - keeping code for later
      // {
      //   title: "Betalingsstatus",
      //   icon: Icons.Table,
      //   items: [
      //     {
      //       title: "Forfaldne Fakturaer",
      //       url: "/dashboard/forfaldne",
      //     },
      //     {
      //       title: "Afventende Betaling",
      //       url: "/dashboard/afventende",
      //     },
      //   ],
      // },
      // Comment out for later phases
      // {
      //   title: "Fakturaer",
      //   icon: Icons.Table,
      //   items: [
      //     {
      //       title: "Alle Fakturaer",
      //       url: "/dashboard/fakturaer",
      //     },
      //     {
      //       title: "Forfaldne",
      //       url: "/dashboard/fakturaer/forfaldne",
      //     },
      //     {
      //       title: "Betalte",
      //       url: "/dashboard/fakturaer/betalte",
      //     },
      //     {
      //       title: "Udestående",
      //       url: "/dashboard/fakturaer/udestaende",
      //     },
      //   ],
      // },
      // {
      //   title: "Rapporter",
      //   icon: Icons.PieChart,
      //   items: [
      //     {
      //       title: "Likviditet",
      //       url: "/dashboard/rapporter/likviditet",
      //     },
      //     {
      //       title: "Inddrivelse",
      //       url: "/dashboard/rapporter/inddrivelse",
      //     },
      //     {
      //       title: "Kundeanalyse",
      //       url: "/dashboard/rapporter/kunder",
      //     },
      //   ],
      // },
    ],
  },
  {
    label: "AUTOMATISERING",
    items: [
      {
        title: "Rykkerautomatik",
        url: "/dashboard/automatik/rykkere",
        icon: Icons.Calendar,
        items: [],
      },
      {
        title: "Integrationer",
        url: "/dashboard/integrationer",
        icon: Icons.Settings,
        items: [],
      },
      {
        title: "API Tester",
        url: "/dashboard/api-tester",
        icon: Icons.Code,
        items: [],
      },
      // Comment out for later
      // {
      //   title: "Betalingspåmindelser",
      //   url: "/dashboard/automatik/paamindelser",
      //   icon: Icons.Bell,
      //   items: [],
      // },
      // {
      //   title: "Integrationer",
      //   url: "/dashboard/integrationer",
      //   icon: Icons.Settings,
      //   items: [],
      // },
      {
        title: "Indstillinger",
        url: "/dashboard/indstillinger",
        icon: Icons.Cog,
        items: [],
      },
    ],
  },
];
