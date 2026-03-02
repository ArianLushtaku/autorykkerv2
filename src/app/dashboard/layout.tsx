import "@/styles/satoshi.css";
import "@/styles/style.css";
import "flatpickr/dist/flatpickr.min.css";
import "jsvectormap/dist/jsvectormap.css";

import { Sidebar } from "./components/Layouts/sidebar";
import { Header } from "./components/Layouts/header";
import { AuthGuard } from "@/components/auth/AuthGuard";
import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import type { PropsWithChildren } from "react";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    template: "%s | Autorykker Dashboard",
    default: "Autorykker Dashboard - Debitorstyring",
  },
  description:
    "Autorykker dashboard for automatiseret debitorstyring og fakturaopfølgning. Administrer dine tilgodehavender effektivt.",
};

export default function DashboardLayout({ children }: PropsWithChildren) {
  return (
    <AuthGuard>
      <Providers>
        <NextTopLoader color="#5750F1" showSpinner={false} />

        <div className="flex min-h-screen">
          <Sidebar />

          <div className="w-full bg-gray-2 dark:bg-[#020d1a]">
            <Header />

            <main className="isolate mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10">
              {children}
            </main>
          </div>
        </div>
      </Providers>
    </AuthGuard>
  );
}
