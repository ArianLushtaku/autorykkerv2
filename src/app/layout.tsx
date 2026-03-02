import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: "%s | Autorykker",
    default: "Autorykker - Automatiser din debitorstyring",
  },
  description: "Automatiser din debitorstyring og optimer din likviditet med Autorykker. Intelligent påmindelser, inkasso og betalingsopfølgning.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="da" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
