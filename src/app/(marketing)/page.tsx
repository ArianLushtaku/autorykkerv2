'use client'

import Link from 'next/link'
import { Clock, TrendingDown, AlertTriangle, Check } from 'lucide-react'

export default function Home() {
  return (
    <>
      {/* ==================== HERO SECTION ==================== */}
      <section className="bg-navy text-white pt-32 pb-24 md:pt-40 md:pb-32 mb-20 relative overflow-hidden">
        {/* Gradient Mesh + Subtle Grid Background */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Gradient mesh for depth - subtle */}
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-lime/12 via-lime/5 to-transparent blur-3xl"></div>
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-lemon/12 via-lemon/5 to-transparent blur-3xl"></div>
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-lime/8 rounded-full blur-3xl"></div>
          
          {/* Subtle grid for structure */}
          <div className="absolute inset-0 opacity-5" 
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(195, 255, 0, 0.3) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(195, 255, 0, 0.3) 1px, transparent 1px)
              `,
              backgroundSize: '80px 80px'
            }}
          ></div>
          
          {/* Accent line - subtle */}
          <div className="absolute bottom-32 left-0 w-full h-px bg-gradient-to-r from-transparent via-lime/20 to-transparent"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-12 lg:gap-20 xl:gap-24 relative z-10">
          {/* Left text */}
          <div className="lg:w-[45%]">
            <h1 className="text-5xl font-bold leading-tight mb-6">
              Få betalingerne hurtigere – uden at løfte en finger
            </h1>
            <p className="text-lg text-gray-200 mb-8">
              Slip for alt bøvlet med betalinger. Autorykker finder, matcher og rykker automatisk.
            </p>
            <div className="flex space-x-4">
              <a href="/signup" className="bg-lime text-navy font-bold px-6 py-3 rounded-xl hover:scale-105 transition-transform">Prøv gratis</a>
              <a href="/demo" className="border border-white px-6 py-3 rounded-xl text-white hover:bg-white hover:text-navy transition">Se demo</a>
            </div>
          </div>

          {/* Right - Benefits Checklist */}
          <div className="lg:w-[55%] space-y-6 relative lg:left-64 xl:left-24">

            <div className="flex items-start gap-4">
              <div className="bg-lime/20 rounded-full p-2 flex-shrink-0">
                <Check className="h-6 w-6 text-lime" />
              </div>
              <div>
                <h3 className="text-white font-bold text-xl mb-1">Automatisk betalingsmatch</h3>
                <p className="text-gray-300">Bankbetalinger matches automatisk med fakturaer</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-lime/20 rounded-full p-2 flex-shrink-0">
                <Check className="h-6 w-6 text-lime" />
              </div>
              <div>
                <h3 className="text-white font-bold text-xl mb-1">Automatiske rykkere</h3>
                <p className="text-gray-300">Påmindelser sendes automatisk til forsinkede betalinger</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-lime/20 rounded-full p-2 flex-shrink-0">
                <Check className="h-6 w-6 text-lime" />
              </div>
              <div>
                <h3 className="text-white font-bold text-xl mb-1">Spar 3+ timer dagligt</h3>
                <p className="text-gray-300">Ingen manuel opfølgning eller bogføring</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-lime/20 rounded-full p-2 flex-shrink-0">
                <Check className="h-6 w-6 text-lime" />
              </div>
              <div>
                <h3 className="text-white font-bold text-xl mb-1">Realtids overblik</h3>
                <p className="text-gray-300">Se status på alle fakturaer og betalinger</p>
              </div>
            </div>
          </div>
        </div>

        {/* Wave SVG */}
        <div className="absolute bottom-0 left-0 right-0 h-16 w-full overflow-hidden">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full">
            <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" fill="#F9FAFB" />
            <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5" fill="#F9FAFB" />
            <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" fill="#F9FAFB" />
          </svg>
        </div>
      </section>

      {/* ==================== PROBLEM/SOLUTION SECTION ==================== */}
      <section className="py-20 md:py-32 bg-gray-50 relative overflow-hidden">
        <div className="absolute top-20 -right-20 w-64 h-64 bg-lime opacity-5 rounded-full blob-1"></div>
        <div className="absolute bottom-20 -left-20 w-64 h-64 bg-lemon opacity-5 rounded-full blob-2"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-navy text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Kender du disse udfordringer?
            </h2>
            <p className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto">
              De fleste virksomheder kæmper med de samme problemer når det kommer til debitorstyring
            </p>
          </div>

          {/* Problems Grid - Navy theme */}
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {[
              { icon: <Clock className="h-8 w-8" />, title: "Timeforbrugende manuel opfølgning", description: "Timer spildt på at ringe og sende emails til kunder der ikke betaler til tiden." },
              { icon: <TrendingDown className="h-8 w-8" />, title: "Dårlig cash flow", description: "Penge sidder fast i udestående tilgodehavender i stedet for at arbejde i virksomheden." },
              { icon: <AlertTriangle className="h-8 w-8" />, title: "Tabte penge på dårlige betalere", description: "Kunder der aldrig betaler og fakturaer der bliver for gamle til at inddrive." }
            ].map((problem, index) => (
              <div key={index} className="bg-white border-2 border-gray-200 rounded-2xl p-8 text-center hover:border-navy/20 transition-colors">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-navy/5 rounded-full text-navy mb-4">
                  {problem.icon}
                </div>
                <h3 className="text-navy text-xl font-bold mb-3">{problem.title}</h3>
                <p className="text-gray-600">{problem.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-lime rounded-full mb-6">
              <svg className="w-8 h-8 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-navy text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Autorykker løser det hele
            </h2>
            <p className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto">
              Med intelligent automatisering og professionel opfølgning
            </p>
          </div>

          {/* Solutions Grid - Lime accent theme */}
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <Check className="h-8 w-8" />, title: "100% automatisk opfølgning", description: "Systemet sender påmindelser automatisk og eskalerer til inkasso når nødvendigt." },
              { icon: <Check className="h-8 w-8" />, title: "70% hurtigere betalinger", description: "Dine kunder betaler i gennemsnit 30 dage hurtigere med vores optimerede proces." },
              { icon: <Check className="h-8 w-8" />, title: "Professionel inkassohåndtering", description: "Juridisk korrekt inddrivelse der overholder alle danske regler og love." }
            ].map((solution, index) => (
              <div key={index} className="bg-white border-2 border-lime/30 rounded-2xl p-8 text-center hover:border-lime transition-colors">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-lime rounded-full text-navy mb-4">
                  {solution.icon}
                </div>
                <h3 className="text-navy text-xl font-bold mb-3">{solution.title}</h3>
                <p className="text-gray-600">{solution.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== TESTIMONIALS SECTION ==================== */}
      <section className="py-20 md:py-32 bg-gray-50 relative overflow-hidden">
        {/* Subtle background elements */}
        <div className="absolute top-20 -right-20 w-64 h-64 bg-lime opacity-5 rounded-full blob-1"></div>
        <div className="absolute bottom-20 -left-20 w-64 h-64 bg-lemon opacity-5 rounded-full blob-2"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <p className="text-navy text-sm font-bold uppercase tracking-wider mb-3">Hvad vores kunder siger</p>
            <h2 className="text-navy text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Betroet af virksomheder over hele Danmark
            </h2>
            <p className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto">
              Skabt til vinduespudsere, servicevirksomheder og alle der vil have deres penge hurtigere
            </p>
          </div>

          {/* Testimonials Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                quote: "Før brugte jeg 2-3 timer om dagen på at følge op på fakturaer. Nu klarer Autorykker det hele automatisk. Jeg får mine penge hurtigere og har tid til at fokusere på mine kunder.", 
                author: "Nicklas Ebbesen", 
                role: "Ejer",
                company: "Ebbesens Vinduespolering ApS",
                stat: "Sparer 15 timer/uge",
                image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=400&fit=crop"
              },
              { 
                quote: "Jeg var skeptisk i starten, men efter første måned fik jeg 40.000 kr ind som havde stået ude i månedsvis. Systemet er simpelt - det virker bare.", 
                author: "Peter Christensen", 
                role: "Indehaver",
                company: "PC Vinduespudsning",
                stat: "40.000 kr inddrevet",
                image: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&h=400&fit=crop"
              },
              { 
                quote: "Mine kunder betaler nu gennemsnitlig inden for 10 dage i stedet for 30-45 dage. Det har gjort en kæmpe forskel for min likviditet. Kan varmt anbefales!", 
                author: "Anders Nielsen", 
                role: "Ejer",
                company: "Nielsen Rengøring",
                stat: "Fra 45 til 10 dage",
                image: "https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=600&h=400&fit=crop"
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all flex flex-col">
                <div className="p-8 flex flex-col flex-grow">
                  {/* Quote */}
                  <div className="mb-6 flex-grow">
                    <svg className="h-8 w-8 text-navy mb-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                    <p className="text-gray-700 text-lg leading-relaxed mb-6">{testimonial.quote}</p>
                  </div>

                  {/* Stat highlight */}
                  <div className="bg-lime/10 border-2 border-lime rounded-xl px-6 py-4 mb-6">
                    <p className="text-navy font-bold text-lg text-center">{testimonial.stat}</p>
                  </div>

                  {/* Author section with initials */}
                  <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
                    <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-lime bg-navy flex items-center justify-center">
                      <span className="text-lime font-bold text-lg">
                        {testimonial.author.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="text-navy font-bold text-base">{testimonial.author}</p>
                      <p className="text-gray-600 text-sm">{testimonial.role}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{testimonial.company}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS SECTION ==================== */}
      <section className="py-20 md:py-32 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <p className="text-navy text-sm font-bold uppercase tracking-wider mb-3">Sådan virker det</p>
            <h2 className="text-navy text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Kom i gang på 3 minutter
            </h2>
            <p className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto">
              Ingen kompliceret opsætning. Ingen teknisk viden krævet.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-lime rounded-full text-navy font-bold text-2xl mb-6 border-4 border-lime shadow-lg">
                1
              </div>
              <h3 className="text-navy text-xl font-bold mb-3">Tilslut dit regnskabssystem</h3>
              <p className="text-gray-600">
                Forbind Dinero med ét klik. Dine fakturaer synkroniseres automatisk.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-lime rounded-full text-navy font-bold text-2xl mb-6 border-4 border-lime shadow-lg">
                2
              </div>
              <h3 className="text-navy text-xl font-bold mb-3">Tilslut din bank</h3>
              <p className="text-gray-600">
                Forbind GoCardless så betalinger matches automatisk med fakturaer.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-lime rounded-full text-navy font-bold text-2xl mb-6 border-4 border-lime shadow-lg">
                3
              </div>
              <h3 className="text-navy text-xl font-bold mb-3">Læn dig tilbage</h3>
              <p className="text-gray-600">
                Autorykker sender rykkere automatisk og matcher betalinger. Du gør ingenting.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href="/signup" className="inline-block bg-lime text-navy font-bold px-8 py-4 rounded-xl hover:scale-105 transition-transform">
              Start gratis prøveperiode
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== KEY FEATURES SECTION ==================== */}
      <section className="py-20 md:py-32 bg-gray-50 relative overflow-hidden">
        <div className="absolute top-32 -left-32 w-80 h-80 bg-lemon opacity-5 rounded-full blob-1"></div>
        <div className="absolute bottom-32 -right-32 w-96 h-96 bg-lime opacity-5 rounded-full blob-2"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-navy text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Alt du behøver til at få dine penge hurtigere
            </h2>
            <p className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto">
              Automatisering der faktisk virker
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-lime/30 transition-colors">
              <div className="w-12 h-12 bg-lime rounded-lg flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-navy" />
              </div>
              <h3 className="text-navy text-xl font-bold mb-3">Automatiske rykkere</h3>
              <p className="text-gray-600">
                Send påmindelser automatisk efter 7, 14 og 30 dage. Ingen manuel opfølgning.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-lime/30 transition-colors">
              <div className="w-12 h-12 bg-lime rounded-lg flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-navy" />
              </div>
              <h3 className="text-navy text-xl font-bold mb-3">Automatisk betalingsmatch</h3>
              <p className="text-gray-600">
                Bankbetalinger matches automatisk med fakturaer. Spar timer på bogføring.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-lime/30 transition-colors">
              <div className="w-12 h-12 bg-lime rounded-lg flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-navy" />
              </div>
              <h3 className="text-navy text-xl font-bold mb-3">Realtids overblik</h3>
              <p className="text-gray-600">
                Se præcis hvem der skylder hvad, og hvornår de skal betale. Alt på ét sted.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-lime/30 transition-colors">
              <div className="w-12 h-12 bg-lime rounded-lg flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-navy" />
              </div>
              <h3 className="text-navy text-xl font-bold mb-3">Dinero integration</h3>
              <p className="text-gray-600">
                Synkroniser fakturaer automatisk fra Dinero. Ingen manuel indtastning.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-lime/30 transition-colors">
              <div className="w-12 h-12 bg-lime rounded-lg flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-navy" />
              </div>
              <h3 className="text-navy text-xl font-bold mb-3">GoCardless integration</h3>
              <p className="text-gray-600">
                Forbind din bank og se betalinger i realtid. Automatisk afstemning.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-lime/30 transition-colors">
              <div className="w-12 h-12 bg-lime rounded-lg flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-navy" />
              </div>
              <h3 className="text-navy text-xl font-bold mb-3">Inkasso håndtering</h3>
              <p className="text-gray-600">
                Eskalér automatisk til inkasso hvis kunden ikke betaler. Juridisk korrekt.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href="/funktioner" className="inline-block text-navy font-bold hover:text-navy/70 transition-colors underline">
              Se alle funktioner →
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== CTA SECTION ==================== */}
      <section className="py-16 md:py-24 bg-navy text-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-lime opacity-10 rounded-full blob-1"></div>
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-lemon opacity-10 rounded-full blob-2"></div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6">
            Opret en gratis konto og kom i gang på under 2 minutter
          </h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto text-base md:text-lg">
            Ingen binding. Ingen kreditkort nødvendig. Komplet tilfredshedsgaranti.
          </p>
          <Link href="/signup" className="inline-block bg-lime text-navy font-bold px-8 py-4 rounded-xl hover:scale-105 transition-transform">
            Start din gratis prøveperiode
          </Link>
        </div>
      </section>
    </>
  )
}
