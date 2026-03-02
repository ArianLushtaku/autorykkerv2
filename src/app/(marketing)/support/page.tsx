import PageHero from '@/components/marketing/PageHero'
import Link from 'next/link'

const faqItems = [
  {
    question: "Hvordan kommer jeg i gang med Autorykker?",
    answer: "Du kan oprette en gratis konto på under 2 minutter. Følg vores 'Kom i gang' guide for at sætte systemet op."
  },
  {
    question: "Hvilke regnskabssystemer integrerer I med?",
    answer: "Vi integrerer med alle de førende danske regnskabssystemer inklusiv Economic, Dinero, Billy, og mange flere."
  },
  {
    question: "Er der binding på abonnementet?",
    answer: "Nej, alle vores planer er uden binding. Du kan opsige når som helst med 30 dages varsel."
  },
  {
    question: "Hvor hurtigt virker de automatiske påmindelser?",
    answer: "Påmindelser sendes automatisk baseret på dine indstillinger - typisk 7, 14 og 30 dage efter forfald."
  }
]

export default function SupportPage() {
  return (
    <>
      <PageHero 
        title="Support"
        subtitle="Vi er her for at hjælpe dig. Find svar på dine spørgsmål eller kontakt vores supportteam."
        showCTA={true}
        ctaText="Kontakt support"
        ctaLink="/kontakt"
      />
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Contact Options */}
            <div>
              <h2 className="text-2xl font-bold text-navy mb-8">Kontakt os</h2>
              
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-lime rounded-full flex items-center justify-center mr-4">
                      <span className="text-navy font-bold">📧</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-navy">Email Support</h3>
                      <p className="text-gray-600">Svar inden for 2 timer</p>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Send os en email med dit spørgsmål, så vender vi tilbage hurtigst muligt.
                  </p>
                  <a 
                    href="mailto:support@autorykker.dk"
                    className="inline-block bg-lime text-navy font-bold px-6 py-3 rounded-xl hover:scale-105 transition-transform"
                  >
                    Send email
                  </a>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-lime rounded-full flex items-center justify-center mr-4">
                      <span className="text-navy font-bold">📞</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-navy">Telefon Support</h3>
                      <p className="text-gray-600">Hverdage 9-17</p>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Ring til os for øjeblikkelig hjælp med dit spørgsmål.
                  </p>
                  <a 
                    href="tel:+4570123456"
                    className="inline-block bg-lime text-navy font-bold px-6 py-3 rounded-xl hover:scale-105 transition-transform"
                  >
                    Ring nu: +45 70 12 34 56
                  </a>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-lime rounded-full flex items-center justify-center mr-4">
                      <span className="text-navy font-bold">💬</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-navy">Live Chat</h3>
                      <p className="text-gray-600">Øjeblikkelig hjælp</p>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Chat med vores supportteam direkte i systemet.
                  </p>
                  <Link 
                    href="/kontakt"
                    className="inline-block bg-lime text-navy font-bold px-6 py-3 rounded-xl hover:scale-105 transition-transform"
                  >
                    Kontakt os
                  </Link>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div>
              <h2 className="text-2xl font-bold text-navy mb-8">Ofte stillede spørgsmål</h2>
              
              <div className="space-y-4">
                {faqItems.map((item, index) => (
                  <div key={index} className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="font-bold text-navy mb-3">
                      {item.question}
                    </h3>
                    <p className="text-gray-600">
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-8 text-center">
                <Link 
                  href="/guider"
                  className="inline-block bg-gray-100 text-navy font-bold px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Se alle guider
                </Link>
              </div>
            </div>
          </div>

          {/* Help Resources */}
          <div className="bg-gray-50 rounded-2xl p-8 mt-16">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-navy mb-4">
                Andre hjælperessourcer
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link 
                href="/guider"
                className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow"
              >
                <div className="w-16 h-16 bg-lime rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-navy font-bold text-2xl">📚</span>
                </div>
                <h3 className="font-bold text-navy mb-2">Guider</h3>
                <p className="text-gray-600">Step-by-step vejledninger</p>
              </Link>

              <Link 
                href="/blog"
                className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow"
              >
                <div className="w-16 h-16 bg-lime rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-navy font-bold text-2xl">📝</span>
                </div>
                <h3 className="font-bold text-navy mb-2">Blog</h3>
                <p className="text-gray-600">Tips og best practices</p>
              </Link>

              <a 
                href="https://status.autorykker.dk"
                className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow"
              >
                <div className="w-16 h-16 bg-lime rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-navy font-bold text-2xl">📊</span>
                </div>
                <h3 className="font-bold text-navy mb-2">Status</h3>
                <p className="text-gray-600">System status og opdateringer</p>
              </a>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
