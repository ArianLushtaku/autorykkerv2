'use client'

import PageHero from '@/components/marketing/PageHero'
import { Code, Zap, Shield, Copy } from 'lucide-react'
import Link from 'next/link'

const endpoints = [
  {
    method: "GET",
    endpoint: "/api/v1/invoices",
    description: "Hent alle fakturaer med filtrering og paginering"
  },
  {
    method: "POST", 
    endpoint: "/api/v1/invoices",
    description: "Opret en ny faktura i systemet"
  },
  {
    method: "PUT",
    endpoint: "/api/v1/invoices/{id}",
    description: "Opdater en eksisterende faktura"
  },
  {
    method: "GET",
    endpoint: "/api/v1/reminders",
    description: "Hent påmindelser for specifikke fakturaer"
  },
  {
    method: "POST",
    endpoint: "/api/v1/reminders/send",
    description: "Send påmindelse til kunde"
  },
  {
    method: "GET",
    endpoint: "/api/v1/customers",
    description: "Hent kundeoplysninger og betalingshistorik"
  }
]

const codeExample = `// Hent alle fakturaer
const response = await fetch('https://api.autorykker.dk/v1/invoices', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

const invoices = await response.json();
console.log(invoices);`

const webhookExample = `{
  "event": "invoice.payment_received",
  "data": {
    "invoice_id": "inv_123456",
    "amount": 2500.00,
    "currency": "DKK",
    "paid_at": "2024-12-15T10:30:00Z",
    "customer": {
      "id": "cust_789",
      "name": "Eksempel Virksomhed ApS"
    }
  },
  "timestamp": "2024-12-15T10:30:05Z"
}`

export default function APIPage() {
  return (
    <>
      <PageHero 
        title="API Dokumentation"
        subtitle="Integrer Autorykker med dine systemer ved hjælp af vores kraftfulde REST API og webhooks."
        showCTA={true}
        ctaText="Få API nøgle"
        ctaLink="/signup"
      />
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {/* Quick Start */}
          <div className="mb-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-navy mb-6">
                Kom i gang på minutter
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Vores API er designet til at være intuitivt og kraftfuldt. Start med at oprette en API-nøgle.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-lime rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-navy font-bold text-xl">1</span>
                </div>
                <h3 className="text-lg font-bold text-navy mb-2">Opret konto</h3>
                <p className="text-gray-600">Tilmeld dig Autorykker og få adgang til API-et</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-lime rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-navy font-bold text-xl">2</span>
                </div>
                <h3 className="text-lg font-bold text-navy mb-2">Generer API nøgle</h3>
                <p className="text-gray-600">Opret din API nøgle i dashboard indstillinger</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-lime rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-navy font-bold text-xl">3</span>
                </div>
                <h3 className="text-lg font-bold text-navy mb-2">Test API</h3>
                <p className="text-gray-600">Prøv dine første API kald med vores eksempler</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-lime rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-navy font-bold text-xl">4</span>
                </div>
                <h3 className="text-lg font-bold text-navy mb-2">Integrer</h3>
                <p className="text-gray-600">Byg din integration med vores SDKs</p>
              </div>
            </div>
          </div>

          {/* Code Example */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-navy mb-6">
                Simpelt at bruge
              </h2>
              <p className="text-xl text-gray-600">
                Vores API følger REST principper og returnerer JSON responses.
              </p>
            </div>

            <div className="bg-gray-900 rounded-2xl p-8 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Code className="h-5 w-5 text-lime mr-2" />
                  <span className="text-white font-medium">JavaScript Eksempel</span>
                </div>
                <button 
                  onClick={() => navigator.clipboard.writeText(codeExample)}
                  className="flex items-center text-gray-400 hover:text-white transition-colors"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Kopier
                </button>
              </div>
              <pre className="text-green-400 text-sm overflow-x-auto">
                <code>{codeExample}</code>
              </pre>
            </div>
          </div>

          {/* API Endpoints */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-navy mb-6">
                Populære endpoints
              </h2>
              <p className="text-xl text-gray-600">
                De mest anvendte API endpoints til at komme i gang.
              </p>
            </div>

            <div className="space-y-4">
              {endpoints.map((endpoint, index) => (
                <div key={index} className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold mr-4 ${
                        endpoint.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                        endpoint.method === 'POST' ? 'bg-green-100 text-green-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {endpoint.method}
                      </span>
                      <div>
                        <code className="text-navy font-mono font-semibold">{endpoint.endpoint}</code>
                        <p className="text-gray-600 text-sm mt-1">{endpoint.description}</p>
                      </div>
                    </div>
                    <Link href="/support" className="text-navy hover:text-navy/70 transition-colors font-medium">
                      Se docs →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Webhooks */}
          <div className="mb-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl font-bold text-navy mb-6">
                  Real-time webhooks
                </h2>
                <p className="text-xl text-gray-600 mb-8">
                  Få øjeblikkelige notifikationer når der sker ændringer i dine data. 
                  Perfekt til at holde dine systemer synkroniserede.
                </p>
                <ul className="space-y-4 mb-8">
                  {[
                    "Betalinger modtaget",
                    "Påmindelser sendt", 
                    "Fakturaer oprettet",
                    "Kundeoplysninger opdateret"
                  ].map((item, index) => (
                    <li key={index} className="flex items-center">
                      <Zap className="h-5 w-5 text-navy mr-3" />
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link 
                  href="/api/webhooks"
                  className="inline-block bg-lime text-navy font-bold px-6 py-3 rounded-xl hover:scale-105 transition-transform"
                >
                  Læs webhook docs
                </Link>
              </div>
              <div>
                <div className="bg-gray-900 rounded-2xl p-6">
                  <div className="flex items-center mb-4">
                    <span className="text-white font-medium">Webhook Payload</span>
                  </div>
                  <pre className="text-green-400 text-sm overflow-x-auto">
                    <code>{webhookExample}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* SDKs */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-navy mb-6">
                SDKs & biblioteker
              </h2>
              <p className="text-xl text-gray-600">
                Officielle SDKs til de mest populære programmeringssprog.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { name: "Node.js", version: "v2.1.0", downloads: "12.5k" },
                { name: "Python", version: "v1.8.2", downloads: "8.2k" },
                { name: "PHP", version: "v1.5.1", downloads: "5.1k" }
              ].map((sdk, index) => (
                <div key={index} className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
                  <div className="w-16 h-16 bg-lime rounded-full flex items-center justify-center mx-auto mb-4">
                    <Code className="h-8 w-8 text-navy" />
                  </div>
                  <h3 className="text-xl font-bold text-navy mb-2">{sdk.name}</h3>
                  <p className="text-gray-600 mb-4">Version {sdk.version}</p>
                  <p className="text-sm text-gray-500 mb-6">{sdk.downloads} downloads</p>
                  <Link 
                    href="/kontakt"
                    className="block w-full bg-gray-100 text-navy font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Kontakt os
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Security */}
          <div className="bg-navy text-white rounded-2xl p-12 mb-20">
            <div className="text-center mb-8">
              <Shield className="h-16 w-16 text-lime mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-6">
                Sikkerhed i fokus
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Vores API er bygget med sikkerhed som første prioritet. Alle requests er krypterede og autentificerede.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-lime mb-2">HTTPS</div>
                <div className="text-gray-300">Alle API kald er krypterede</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-lime mb-2">OAuth 2.0</div>
                <div className="text-gray-300">Sikker autentificering</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-lime mb-2">Rate Limiting</div>
                <div className="text-gray-300">Beskyttelse mod misbrug</div>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-navy mb-6">
              Har du brug for hjælp?
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Vores udviklerteam er klar til at hjælpe dig med integration og tekniske spørgsmål.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/support"
                className="bg-lime text-navy font-bold px-8 py-4 rounded-xl hover:scale-105 transition-transform"
              >
                Kontakt support
              </Link>
              <Link 
                href="/api/docs"
                className="border-2 border-navy text-navy font-bold px-8 py-4 rounded-xl hover:scale-105 transition-transform"
              >
                Fuld dokumentation
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
