/**
 * Chatbot Knowledge Base
 * 
 * This file contains structured data that the chatbot uses to answer questions.
 * Update this file when pricing, features, or contact info changes.
 * URLs are included so the chatbot can provide direct links in responses.
 */

import { PRICING_PLANS, getYearlyMonthlyPrice } from './pricing'

export const COMPANY_INFO = {
  name: 'Autorykker',
  tagline: 'Automatiseret debitorstyring for danske virksomheder',
  description: 'Autorykker integrerer med din bank og registrerer automatisk betalinger. Systemet sender automatisk påmindelser og rykkere for ubetalte fakturaer.',
  integration: 'Dinero',
  bankIntegration: 'GoCardless',
}

// All internal page URLs - chatbot should link to these
export const PAGES = {
  home: '/',
  signup: '/signup',
  login: '/login',
  pricing: '/priser',
  features: '/funktioner',
  product: '/produkt',
  integrations: '/integrationer',
  demo: '/demo',
  contact: '/kontakt',
  support: '/support',
  about: '/om-os',
  blog: '/blog',
  api: '/api',
  roiCalculator: '/roi-regner',
  resources: '/ressourcer',
}

export const PRICING = {
  currency: 'DKK',
  trialDays: 14,
  // Use shared pricing config
  plans: PRICING_PLANS.map(plan => ({
    name: plan.name,
    monthlyPrice: plan.monthlyPrice,
    yearlyPrice: plan.yearlyPrice,
    yearlyMonthlyPrice: getYearlyMonthlyPrice(plan),
    invoiceLimit: plan.invoiceLimit,
    features: plan.features,
    limitations: plan.limitations,
    popular: plan.popular,
  })),
}

export const FEATURES = [
  'Dinero integration med automatisk synkronisering',
  'Bank integration via GoCardless',
  'Automatisk betalingsmatching',
  'Email og SMS rykkere',
  'Automatisk rykkerflow',
  'Inkasso-kø håndtering',
  'Dashboard med overblik',
]

export const CONTACT = {
  email: 'support@autorykker.dk',
  supportHours: 'Hverdage 9-17',
  demoUrl: '/demo',
  signupUrl: '/signup',
}

export const FAQ = [
  { q: 'Hvad er Autorykker?', a: `Autorykker automatiserer betalingspåmindelser og rykkere. Læs mere: ${PAGES.product}` },
  { q: 'Hvilke systemer integrerer I med?', a: `Vi integrerer med Dinero og banker via GoCardless. Se alle: ${PAGES.integrations}` },
  { q: 'Er der binding?', a: 'Nej, ingen binding. Du kan opsige når som helst.' },
  { q: 'Hvordan kommer jeg i gang?', a: `1. Opret konto: ${PAGES.signup}\n2. Forbind Dinero\n3. Forbind bank\nFærdig! Prøv gratis i 14 dage.` },
  { q: 'Hvad koster det?', a: `Se priser og vælg plan: ${PAGES.pricing}` },
  { q: 'Kan jeg se en demo?', a: `Book en gratis demo her: ${PAGES.demo}` },
  { q: 'Hvordan kontakter jeg jer?', a: `Skriv til os: ${PAGES.contact} eller email: ${CONTACT.email}` },
]

/**
 * Generates a compact system prompt for the chatbot.
 * Includes direct links so the bot can provide actionable responses.
 */
export function generateSystemPrompt(): string {
  const priceList = PRICING.plans
    .map(p => {
      const price = p.monthlyPrice ? `${p.monthlyPrice} kr/md` : 'Tilpasset pris - kontakt os'
      const invoices = p.invoiceLimit === -1 ? 'ubegrænset' : p.invoiceLimit
      const users = p.users === -1 ? 'ubegrænset' : p.users
      return `${p.name}: ${price} (${invoices} fakturaer, ${users} bruger${p.users !== 1 ? 'e' : ''})`
    })
    .join('\n')

  return `Du er kundeservice for ${COMPANY_INFO.name} - ${COMPANY_INFO.tagline}.

HVAD ER AUTORYKKER:
${COMPANY_INFO.description}
Integrerer med: ${COMPANY_INFO.integration} (regnskab) og ${COMPANY_INFO.bankIntegration} (bank).

VIGTIGE LINKS (brug disse i dine svar):
- Opret konto / Kom i gang: ${PAGES.signup}
- Se priser: ${PAGES.pricing}
- Book demo: ${PAGES.demo}
- Kontakt os: ${PAGES.contact}
- Se funktioner: ${PAGES.features}
- Integrationer: ${PAGES.integrations}
- ROI beregner: ${PAGES.roiCalculator}
- Support: ${PAGES.support}
- Log ind: ${PAGES.login}

PRISER (${PRICING.trialDays} dages gratis prøve, ingen binding):
${priceList}
Detaljer: ${PAGES.pricing}

FUNKTIONER:
${FEATURES.map(f => `• ${f}`).join('\n')}

KONTAKT:
Email: ${CONTACT.email} (${CONTACT.supportHours})

REGLER:
- Svar på dansk, kort og præcist (2-3 sætninger)
- ALTID embed links med beskrivende tekst - ALDRIG vis rå URLs
- Brug KUN relative paths (starter med /) - ALDRIG fulde URLs med domæne
- Brug markdown: [tekst](/path) - eksempel: [Opret konto](/signup)
- KORREKT: [oprette en konto](/signup) 
- FORKERT: [oprette en konto](https://autorykker.dk/signup)
- Brug enkelt sprog (gymnasieniveau)
- Henvis til ${CONTACT.email} hvis du er usikker`
}
