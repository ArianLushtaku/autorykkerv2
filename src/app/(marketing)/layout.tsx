import Navigation from '@/components/marketing/Navigation'
import Footer from '@/components/marketing/Footer'
import CookieConsent from '@/components/marketing/CookieConsent'
import ChatBot from '@/components/marketing/ChatBot'
import type { PropsWithChildren } from 'react'

export default function MarketingLayout({ children }: PropsWithChildren) {
  return (
    <>
      <Navigation />
      {children}
      <Footer />
      <CookieConsent />
      <ChatBot />
    </>
  )
}
