import PageHero from '@/components/marketing/PageHero'
import { Check, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

const integrations = [
  {
    name: "Economic",
    logo: "/marketing/uploads/logo-economic.svg",
    category: "Regnskab",
    description: "Seamløs integration med Economic for automatisk fakturasynkronisering"
  },
  {
    name: "Dinero",
    logo: "/marketing/uploads/logo-dinero.svg",
    category: "Regnskab",
    description: "Direkte forbindelse til Dinero for real-time datasynkronisering"
  },
  {
    name: "Billy",
    logo: "/marketing/uploads/logo-billy.svg",
    category: "Regnskab",
    description: "Automatisk import af fakturaer og kundedata fra Billy"
  },
  {
    name: "Visma",
    logo: "/marketing/uploads/logo-visma.svg",
    category: "Regnskab",
    description: "Integration med Visma Business og Visma Administration"
  },
  {
    name: "Fortnox",
    logo: "/marketing/uploads/logo-fortnox.svg",
    category: "Regnskab",
    description: "Nordisk regnskabsløsning med fuld Autorykker integration"
  },
  {
    name: "Uniconta",
    logo: "/marketing/uploads/logo-uniconta.svg",
    category: "ERP",
    description: "Komplet ERP integration med Uniconta systemet"
  },
  {
    name: "Salesforce",
    logo: "/marketing/uploads/logo-salesforce.svg",
    category: "CRM",
    description: "Synkroniser kundedata og betalingsstatus med Salesforce"
  },
  {
    name: "HubSpot",
    logo: "/marketing/uploads/logo-hubspot.svg",
    category: "CRM",
    description: "Automatisk opdatering af kundeoplysninger i HubSpot"
  },
  {
    name: "Zapier",
    logo: "/marketing/uploads/logo-zapier.svg",
    category: "Automation",
    description: "Forbind Autorykker med 3000+ andre apps via Zapier"
  }
]

const benefits = [
  "Automatisk datasynkronisering",
  "Real-time opdateringer",
  "Ingen manuel indtastning",
  "Reduceret fejlrisiko",
  "Øget produktivitet",
  "Bedre datakvalitet"
]

export default function IntegrationsPage() {
  return (
    <>
      <PageHero 
        title="Integrationer"
        subtitle="Forbind Autorykker med dine eksisterende systemer for seamløs dataflow og maksimal effektivitet."
        showCTA={true}
        ctaText="Se alle integrationer"
        ctaLink="#integrations"
      />
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {/* Benefits Section */}
          <div className="mb-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-navy mb-6">
                Hvorfor integrere med Autorykker?
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Vores integrationer sikrer, at dine systemer arbejder sammen som én sammenhængende løsning.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center bg-white rounded-xl border border-gray-200 p-6">
                  <Check className="h-6 w-6 text-green-500 mr-4 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Integration Categories */}
          <div className="mb-20" id="integrations">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-navy mb-6">
                Populære integrationer
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Vi integrerer med de mest anvendte business-systemer i Danmark og Norden.
              </p>
            </div>

            {/* Regnskab */}
            <div className="mb-16">
              <h3 className="text-2xl font-bold text-navy mb-8">Regnskabssystemer</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {integrations.filter(int => int.category === 'Regnskab').map((integration, index) => (
                  <div key={index} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center mb-4">
                      <Image 
                        src={integration.logo}
                        alt={integration.name}
                        width={120}
                        height={60}
                        className="h-12 w-auto"
                      />
                    </div>
                    <h4 className="text-lg font-bold text-navy mb-2">{integration.name}</h4>
                    <p className="text-gray-600 text-sm">{integration.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CRM */}
            <div className="mb-16">
              <h3 className="text-2xl font-bold text-navy mb-8">CRM Systemer</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {integrations.filter(int => int.category === 'CRM').map((integration, index) => (
                  <div key={index} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center mb-4">
                      <Image 
                        src={integration.logo}
                        alt={integration.name}
                        width={120}
                        height={60}
                        className="h-12 w-auto"
                      />
                    </div>
                    <h4 className="text-lg font-bold text-navy mb-2">{integration.name}</h4>
                    <p className="text-gray-600 text-sm">{integration.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Other */}
            <div className="mb-16">
              <h3 className="text-2xl font-bold text-navy mb-8">Andre systemer</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {integrations.filter(int => !['Regnskab', 'CRM'].includes(int.category)).map((integration, index) => (
                  <div key={index} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center mb-4">
                      <Image 
                        src={integration.logo}
                        alt={integration.name}
                        width={120}
                        height={60}
                        className="h-12 w-auto"
                      />
                    </div>
                    <h4 className="text-lg font-bold text-navy mb-2">{integration.name}</h4>
                    <p className="text-gray-600 text-sm">{integration.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* API Section */}
          <div className="bg-navy text-white rounded-2xl p-12 mb-20">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-6">
                Bygget til udviklere
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Vores REST API gør det nemt at bygge custom integrationer og automatiseringer.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-lime mb-2">REST API</div>
                <div className="text-gray-300">Moderne og brugervenlig</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-lime mb-2">Webhooks</div>
                <div className="text-gray-300">Real-time notifikationer</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-lime mb-2">SDKs</div>
                <div className="text-gray-300">Python, Node.js, PHP</div>
              </div>
            </div>

            <div className="text-center mt-8">
              <Link 
                href="/api"
                className="inline-flex items-center bg-lime text-navy font-bold px-8 py-4 rounded-xl hover:scale-105 transition-transform"
              >
                Se API dokumentation
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Custom Integration */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-navy mb-6">
              Mangler du en integration?
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Vi bygger gerne custom integrationer til dit specifikke system. Kontakt os for at høre mere.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/kontakt"
                className="bg-lime text-navy font-bold px-8 py-4 rounded-xl hover:scale-105 transition-transform"
              >
                Anmod om integration
              </Link>
              <Link 
                href="/api"
                className="border-2 border-navy text-navy font-bold px-8 py-4 rounded-xl hover:scale-105 transition-transform"
              >
                Se API docs
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
