import PageHero from '@/components/marketing/PageHero'
import { Check, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const features = [
  {
    title: "Automatiske påmindelser",
    description: "Skræddersyede betalingspåmindelser sendes automatisk til dine kunder med jævne mellemrum.",
    icon: "📧",
    benefits: ["Personaliserede beskeder", "Automatisk timing", "Multi-kanal kommunikation"]
  },
  {
    title: "Intelligent dashboard",
    description: "Få komplet overblik over dine tilgodehavender med real-time data og avancerede analyser.",
    icon: "📊",
    benefits: ["Real-time opdateringer", "Avancerede rapporter", "Predictive analytics"]
  },
  {
    title: "Automatisk inkasso",
    description: "Systemet håndterer hele inkassoprocessen fra påmindelse til juridisk inddrivelse.",
    icon: "⚖️",
    benefits: ["Juridisk compliance", "Automatisk eskalering", "Professionel håndtering"]
  },
  {
    title: "Seamløse integrationer",
    description: "Integrerer direkte med dit regnskabssystem for automatisk datasynkronisering.",
    icon: "🔗",
    benefits: ["200+ integrationer", "Real-time sync", "Nem opsætning"]
  },
  {
    title: "AI-drevet optimering",
    description: "Machine learning optimerer din inkassostrategi baseret på kundeadfærd og betalingsmønstre.",
    icon: "🤖",
    benefits: ["Predictive scoring", "Optimal timing", "Personaliserede strategier"]
  },
  {
    title: "Compliance & sikkerhed",
    description: "Fuld overholdelse af GDPR og danske inkassolove med bank-niveau sikkerhed.",
    icon: "🔒",
    benefits: ["GDPR compliant", "256-bit kryptering", "ISO 27001 certificeret"]
  }
]

export default function ProduktPage() {
  return (
    <>
      <PageHero 
        title="Produkt"
        subtitle="Automatiser din debitorstyring med Danmarks mest avancerede platform for inkasso og betalingsopfølgning."
        showCTA={true}
        ctaText="Prøv gratis"
        ctaLink="/signup"
      />
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {/* Key Benefits */}
          <div className="mb-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-navy mb-6">
                Alt du behøver for effektiv debitorstyring
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Autorykker kombinerer kraftfuld automatisering med intelligent teknologi for at give dig den mest effektive løsning på markedet.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg transition-shadow">
                  <div className="text-4xl mb-6">{feature.icon}</div>
                  <h3 className="text-xl font-bold text-navy mb-4">{feature.title}</h3>
                  <p className="text-gray-600 mb-6">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-center text-sm text-gray-600">
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* How it Works */}
          <div className="mb-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-navy mb-6">
                Sådan virker det
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Kom i gang på under 5 minutter og automatiser din debitorstyring med disse simple trin.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-lime rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-navy font-bold text-xl">1</span>
                </div>
                <h3 className="text-lg font-bold text-navy mb-4">Tilslut dit system</h3>
                <p className="text-gray-600">Integrer med dit regnskabssystem på få minutter</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-lime rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-navy font-bold text-xl">2</span>
                </div>
                <h3 className="text-lg font-bold text-navy mb-4">Konfigurer regler</h3>
                <p className="text-gray-600">Sæt dine præferencer for påmindelser og inkasso</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-lime rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-navy font-bold text-xl">3</span>
                </div>
                <h3 className="text-lg font-bold text-navy mb-4">Automatiser</h3>
                <p className="text-gray-600">Systemet overtager og håndterer alt automatisk</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-lime rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-navy font-bold text-xl">4</span>
                </div>
                <h3 className="text-lg font-bold text-navy mb-4">Optimer</h3>
                <p className="text-gray-600">AI lærer og forbedrer din inkassostrategi løbende</p>
              </div>
            </div>
          </div>

          {/* ROI Calculator */}
          <div className="bg-gray-50 rounded-2xl p-8 mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-navy mb-6">
                Beregn dit potentiale
              </h2>
              <p className="text-xl text-gray-600">
                Se hvor meget Autorykker kan spare din virksomhed
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="bg-white rounded-xl p-6">
                <div className="text-3xl font-bold text-navy mb-2">70%</div>
                <div className="text-gray-600">Reduktion i udestående</div>
              </div>
              <div className="bg-white rounded-xl p-6">
                <div className="text-3xl font-bold text-navy mb-2">15 timer</div>
                <div className="text-gray-600">Spart per måned</div>
              </div>
              <div className="bg-white rounded-xl p-6">
                <div className="text-3xl font-bold text-navy mb-2">25%</div>
                <div className="text-gray-600">Hurtigere betalinger</div>
              </div>
            </div>

            <div className="text-center mt-8">
              <Link 
                href="/priser"
                className="inline-flex items-center bg-lime text-navy font-bold px-8 py-4 rounded-xl hover:scale-105 transition-transform"
              >
                Se priser og ROI
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-navy mb-6">
              Klar til at komme i gang?
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Opret en gratis konto og se hvordan Autorykker kan transformere din debitorstyring.
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
                Book demo
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
