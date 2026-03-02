import PageHero from '@/components/marketing/PageHero'
import Link from 'next/link'

const teamMembers = [
  {
    name: "Arian Lushtaku",
    initials: "AL",
    role: "CEO & Founder",
    bio: "Erfaren iværksætter med passion for fintech og automatisering. Grundlagde Autorykker for at hjælpe danske virksomheder med debitorstyring."
  },
  {
    name: "Maria Andersen",
    initials: "MA",
    role: "CTO",
    bio: "Tech-ekspert med passion for at skabe brugervenlige løsninger. Tidligere hos Microsoft."
  },
  {
    name: "Thomas Jensen",
    initials: "TJ",
    role: "Head of Sales",
    bio: "Specialist i B2B salg og kundeforhold. Hjælper virksomheder med at optimere deres processer."
  }
]

export default function OmOsPage() {
  return (
    <>
      <PageHero 
        title="Om Autorykker"
        subtitle="Vi hjælper danske virksomheder med at automatisere deres debitorstyring og få bedre styr på likviditeten."
        showCTA={true}
        ctaText="Kontakt os"
        ctaLink="/kontakt"
      />
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {/* Mission Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-20">
            <div>
              <h2 className="text-3xl font-bold text-navy mb-6">Vores mission</h2>
              <p className="text-gray-600 mb-6 text-lg">
                Hos Autorykker tror vi på, at ingen virksomhed skal spilde tid på manuel debitorstyring. 
                Vores mission er at automatisere og optimere inkassoprocessen, så du kan fokusere på det, 
                der virkelig betyder noget for din virksomhed.
              </p>
              <p className="text-gray-600 text-lg">
                Vi kombinerer avanceret teknologi med dyb forståelse for danske virksomheders behov 
                for at skabe den mest effektive løsning på markedet.
              </p>
            </div>
            <div className="bg-navy rounded-2xl p-8 flex items-center justify-center min-h-[300px]">
              <div className="text-center">
                <div className="text-6xl mb-4">🎯</div>
                <p className="text-lime text-xl font-bold">Automatiseret debitorstyring</p>
                <p className="text-gray-300 mt-2">for danske virksomheder</p>
              </div>
            </div>
          </div>

          {/* Values Section */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-navy text-center mb-12">Vores værdier</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-lime rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-navy font-bold text-3xl">🚀</span>
                </div>
                <h3 className="text-xl font-bold text-navy mb-4">Innovation</h3>
                <p className="text-gray-600">
                  Vi udvikler konstant nye funktioner og forbedringer for at holde os i front af teknologien.
                </p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-lime rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-navy font-bold text-3xl">🤝</span>
                </div>
                <h3 className="text-xl font-bold text-navy mb-4">Tillid</h3>
                <p className="text-gray-600">
                  Vi bygger langvarige relationer baseret på tillid, transparens og pålidelig service.
                </p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-lime rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-navy font-bold text-3xl">⚡</span>
                </div>
                <h3 className="text-xl font-bold text-navy mb-4">Effektivitet</h3>
                <p className="text-gray-600">
                  Vi stræber efter at gøre komplekse processer simple og effektive for vores kunder.
                </p>
              </div>
            </div>
          </div>

          {/* Team Section */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-navy text-center mb-12">Mød teamet</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {teamMembers.map((member, index) => (
                <div key={index} className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
                  <div className="w-32 h-32 rounded-full mx-auto mb-6 bg-navy flex items-center justify-center">
                    <span className="text-lime text-4xl font-bold">{member.initials}</span>
                  </div>
                  <h3 className="text-xl font-bold text-navy mb-2">{member.name}</h3>
                  <p className="text-navy/70 font-medium mb-4">{member.role}</p>
                  <p className="text-gray-600">{member.bio}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Section */}
          <div className="bg-navy text-white rounded-2xl p-12 mb-20">
            <h2 className="text-3xl font-bold text-center mb-12">Autorykker i tal</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-lime mb-2">500+</div>
                <div className="text-gray-300">Tilfredse kunder</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-lime mb-2">2M+</div>
                <div className="text-gray-300">Fakturaer behandlet</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-lime mb-2">85%</div>
                <div className="text-gray-300">Reduktion i udestående</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-lime mb-2">24/7</div>
                <div className="text-gray-300">Automatisk overvågning</div>
              </div>
            </div>
          </div>

          {/* Contact CTA */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-navy mb-6">
              Vil du vide mere om Autorykker?
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Kontakt os for at høre mere om, hvordan vi kan hjælpe din virksomhed med at optimere debitorstyringen.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/kontakt"
                className="bg-lime text-navy font-bold px-8 py-4 rounded-xl hover:scale-105 transition-transform"
              >
                Kontakt os
              </Link>
              <Link 
                href="/signup"
                className="border-2 border-navy text-navy font-bold px-8 py-4 rounded-xl hover:scale-105 transition-transform"
              >
                Start gratis prøveperiode
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
