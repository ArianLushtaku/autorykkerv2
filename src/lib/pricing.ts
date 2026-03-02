// Centralized pricing configuration - update prices here and they reflect everywhere

export const PRICING_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 299,
    yearlyPrice: 2388, // 199 kr/md = 33% rabat
    yearlySavings: 33,
    description: 'Perfekt til små virksomheder der vil komme i gang',
    invoiceLimit: '100 fakturaer/måned',
    features: [
      'Op til 100 fakturaer/måned',
      'Dinero integration',
      'Bank integration (GoCardless)',
      'Automatisk betalingsmatching',
      'Email rykkere',
      '1 bruger inkluderet'
    ],
    shortFeatures: ['Dinero + Bank integration', 'Email rykkere', '1 bruger'],
    limitations: [
      'Ingen SMS rykkere',
      'Ingen API adgang'
    ],
    popular: false,
    cta: 'Vælg Starter'
  },
  {
    id: 'professional',
    name: 'Professional',
    monthlyPrice: 599,
    yearlyPrice: 4668, // 389 kr/md = 35% rabat
    yearlySavings: 35,
    description: 'Mest populære plan for voksende virksomheder',
    invoiceLimit: '500 fakturaer/måned',
    features: [
      'Op til 500 fakturaer/måned',
      'Alt i Starter, plus:',
      'SMS rykkere via Dinero (1 kr/SMS)',
      'Automatisk rykkerflow',
      'Inkasso-kø håndtering',
      'Op til 5 brugere',
      'Email support'
    ],
    shortFeatures: ['SMS rykkere (1 kr/SMS)', 'Automatisk rykkerflow', 'Op til 5 brugere'],
    limitations: [
      'Ingen API adgang'
    ],
    popular: true,
    cta: 'Vælg Professional'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 1299,
    yearlyPrice: 10188, // 849 kr/md = 35% rabat
    yearlySavings: 35,
    description: 'For store virksomheder med avancerede behov',
    invoiceLimit: 'Ubegrænset fakturaer',
    features: [
      'Ubegrænset fakturaer',
      'Alt i Professional, plus:',
      'Custom SMS gateway (0,30 kr/SMS)',
      'Spar 70% på SMS omkostninger',
      'Ubegrænset brugere',
      'Prioriteret support',
      'Dedikeret onboarding',
      'API adgang'
    ],
    shortFeatures: ['Custom SMS (0,30 kr/SMS)', 'Ubegrænset brugere', 'Prioriteret support', 'API adgang'],
    limitations: [],
    popular: false,
    cta: 'Vælg Enterprise'
  }
] as const

export type PlanId = typeof PRICING_PLANS[number]['id']
export type Plan = typeof PRICING_PLANS[number]

// Helper to get yearly price per month
export function getYearlyMonthlyPrice(plan: Plan): number {
  return Math.round(plan.yearlyPrice / 12)
}

// Helper to get a specific plan
export function getPlan(id: PlanId): Plan | undefined {
  return PRICING_PLANS.find(p => p.id === id)
}
