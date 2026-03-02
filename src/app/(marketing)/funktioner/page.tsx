import PageHero from '@/components/marketing/PageHero'
import { Check, ArrowRight, Zap, Shield, Clock, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

const features = [
  {
    icon: <Zap className="h-8 w-8" />,
    title: "Automatiske påmindelser",
    description: "Skræddersyede betalingspåmindelser sendes automatisk til dine kunder baseret på dine præferencer og kundens betalingshistorik.",
    benefits: [
      "Personaliserede beskeder",
      "Optimal timing baseret på AI",
      "Multi-kanal kommunikation",
      "Automatisk eskalering"
    ],
    image: "/marketing/uploads/feature-reminders.jpg"
  },
  {
    icon: <BarChart3 className="h-8 w-8" />,
    title: "Intelligent dashboard",
    description: "Få komplet overblik over dine tilgodehavender med real-time data, avancerede analyser og predictive insights.",
    benefits: [
      "Real-time opdateringer",
      "Avancerede rapporter",
      "Predictive analytics",
      "Custom dashboards"
    ],
    image: "/marketing/uploads/feature-dashboard.jpg"
  },
  {
    icon: <Shield className="h-8 w-8" />,
    title: "Juridisk inkasso",
    description: "Systemet håndterer hele inkassoprocessen fra påmindelse til juridisk inddrivelse i overensstemmelse med dansk lovgivning.",
    benefits: [
      "GDPR compliant",
      "Juridisk korrekt",
      "Automatisk eskalering",
      "Professionel håndtering"
    ],
    image: "/marketing/uploads/feature-legal.jpg"
  },
  {
    icon: <Clock className="h-8 w-8" />,
    title: "AI-optimering",
    description: "Machine learning analyserer kundeadfærd og optimerer din inkassostrategi for maksimal effektivitet og betalingsrate.",
    benefits: [
      "Predictive scoring",
      "Optimal timing",
      "Personaliserede strategier",
      "Kontinuerlig læring"
    ],
    image: "/marketing/uploads/feature-ai.jpg"
  }
]

const integrationLogos = [
  { name: "Economic", logo: "/marketing/uploads/logo-economic.svg" },
  { name: "Dinero", logo: "/marketing/uploads/logo-dinero.svg" },
  { name: "Billy", logo: "/marketing/uploads/logo-billy.svg" },
  { name: "Visma", logo: "/marketing/uploads/logo-visma.svg" },
  { name: "Fortnox", logo: "/marketing/uploads/logo-fortnox.svg" },
  { name: "Uniconta", logo: "/marketing/uploads/logo-uniconta.svg" }
]

export default function FunktionerPage() {
  return (
    <>
      <PageHero 
        title="Funktioner"
        subtitle="Udforsk alle de kraftfulde funktioner der gør Autorykker til Danmarks mest avancerede platform for debitorstyring."
        showCTA={true}
        ctaText="Prøv alle funktioner gratis"
        ctaLink="/signup"
      />
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {/* Core Features */}
          <div className="mb-32">
            {features.map((feature, index) => (
              <div key={index} className={`grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32 ${index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''}`}>
                <div className={`${index % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 bg-lime rounded-2xl flex items-center justify-center mr-4">
                      {feature.icon}
                    </div>
                    <h2 className="text-3xl font-bold text-navy">{feature.title}</h2>
                  </div>
                  <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                    {feature.description}
                  </p>
                  <ul className="space-y-4 mb-8">
                    {feature.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span className="text-gray-700">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  <Link 
                    href="/demo"
                    className="inline-flex items-center bg-lime text-navy font-bold px-6 py-3 rounded-xl hover:scale-105 transition-transform"
                  >
                    Se i aktion
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </div>
                <div className={`${index % 2 === 1 ? 'lg:col-start-1' : ''}`}>
                  <div className="bg-gray-100 rounded-2xl p-8 relative">
                    <Image 
                      src={feature.image}
                      alt={feature.title}
                      width={600}
                      height={400}
                      className="w-full h-auto rounded-xl"
                    />
                    <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-lime opacity-20 rounded-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Additional Features Grid */}
          <div className="mb-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-navy mb-6">
                Og meget mere...
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Autorykker er pakket med funktioner designet til at gøre din debitorstyring så effektiv som muligt.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  title: "Bulk operationer",
                  description: "Håndter hundredvis af fakturaer på én gang med bulk-handlinger."
                },
                {
                  title: "Custom rapporter",
                  description: "Byg dine egne rapporter og dashboards tilpasset dine behov."
                },
                {
                  title: "Team samarbejde",
                  description: "Inviter teammedlemmer og administrer tilladelser granulært."
                },
                {
                  title: "Mobile app",
                  description: "Få adgang til alle funktioner fra din smartphone eller tablet."
                },
                {
                  title: "API adgang",
                  description: "Integrer med dine egne systemer via vores kraftfulde REST API."
                },
                {
                  title: "White-label",
                  description: "Tilpas platformen med dit eget brand og logo (Enterprise)."
                }
              ].map((item, index) => (
                <div key={index} className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-navy mb-3">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Integrations */}
          <div className="mb-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-navy mb-6">
                Seamløse integrationer
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Autorykker integrerer med alle de populære regnskabs- og business-systemer.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center">
              {integrationLogos.map((integration, index) => (
                <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center hover:shadow-lg transition-shadow">
                  <Image 
                    src={integration.logo}
                    alt={integration.name}
                    width={120}
                    height={60}
                    className="h-8 w-auto opacity-60 hover:opacity-100 transition-opacity"
                  />
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link 
                href="/integrationer"
                className="inline-flex items-center text-navy font-medium hover:text-navy/70 transition-colors underline"
              >
                Se alle integrationer
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Security & Compliance */}
          <div className="bg-gray-50 rounded-2xl p-12 mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-navy mb-6">
                Sikkerhed & compliance
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Vi tager sikkerhed alvorligt og overholder alle relevante standarder og lovgivning.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="w-16 h-16 bg-lime rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-navy" />
                </div>
                <h3 className="text-lg font-bold text-navy mb-2">GDPR Compliant</h3>
                <p className="text-gray-600">Fuld overholdelse af GDPR og dansk databeskyttelseslovgivning</p>
              </div>
              <div>
                <div className="w-16 h-16 bg-lime rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-navy font-bold text-xl">🔒</span>
                </div>
                <h3 className="text-lg font-bold text-navy mb-2">256-bit Kryptering</h3>
                <p className="text-gray-600">Bank-niveau sikkerhed med end-to-end kryptering</p>
              </div>
              <div>
                <div className="w-16 h-16 bg-lime rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-navy font-bold text-xl">📋</span>
                </div>
                <h3 className="text-lg font-bold text-navy mb-2">ISO 27001</h3>
                <p className="text-gray-600">Certificeret efter internationale sikkerhedsstandarder</p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-navy mb-6">
              Klar til at opleve alle funktioner?
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Start din gratis prøveperiode i dag og få adgang til alle Autorykkers kraftfulde funktioner.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/signup"
                className="bg-lime text-navy font-bold px-8 py-4 rounded-xl hover:scale-105 transition-transform"
              >
                Start gratis prøveperiode
              </Link>
              <Link 
                href="/demo"
                className="border-2 border-navy text-navy font-bold px-8 py-4 rounded-xl hover:scale-105 transition-transform"
              >
                Book personlig demo
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
