import "@/styles/satoshi.css";
import "@/styles/style.css";
import "flatpickr/dist/flatpickr.min.css";
import "jsvectormap/dist/jsvectormap.css";

import { AuthGuard } from "@/components/auth/AuthGuard";
import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import type { PropsWithChildren } from "react";

export const metadata: Metadata = {
  title: {
    template: "%s | Autorykker Dashboard V4",
    default: "Autorykker Dashboard V4 - Debitorstyring",
  },
  description:
    "Autorykker dashboard V4 preview - ny design med tilpasselige widgets.",
};

export default function DashboardV4Layout({ children }: PropsWithChildren) {
  return (
    <AuthGuard>
      <NextTopLoader color="#7c3aed" showSpinner={false} />
      {children}
    </AuthGuard>
  );
}
