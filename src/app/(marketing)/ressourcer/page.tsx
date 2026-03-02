import PageHero from '@/components/marketing/PageHero'
import Link from 'next/link'
import { ArrowRight, BookOpen, MessageCircle, FileText, Video, Download } from 'lucide-react'

const resources = [
  {
    title: "Kom i gang guide",
    description: "Alt du behøver for at komme i gang med Autorykker på under 10 minutter.",
    type: "Guide",
    icon: <BookOpen className="h-6 w-6" />,
    link: "/guider/kom-i-gang",
    time: "10 min"
  },
  {
    title: "Best practices for inkasso",
    description: "Lær de bedste metoder til effektiv og professionel inkassohåndtering.",
    type: "Guide",
    icon: <FileText className="h-6 w-6" />,
    link: "/blog/best-practices-inkasso",
    time: "15 min"
  },
  {
    title: "API dokumentation",
    description: "Komplet dokumentation for Autorykker REST API og integrationer.",
    type: "Dokumentation",
    icon: <FileText className="h-6 w-6" />,
    link: "/api",
    time: "Løbende"
  },
  {
    title: "Video tutorials",
    description: "Se hvordan du bruger Autorykker med vores step-by-step video guides.",
    type: "Video",
    icon: <Video className="h-6 w-6" />,
    link: "/tutorials",
    time: "5-20 min"
  },
  {
    title: "Webinarer",
    description: "Deltag i vores månedlige webinarer om debitorstyring og automatisering.",
    type: "Webinar",
    icon: <Video className="h-6 w-6" />,
    link: "/webinarer",
    time: "45 min"
  },
  {
    title: "ROI calculator",
    description: "Beregn hvor meget Autorykker kan spare din virksomhed årligt.",
    type: "Værktøj",
    icon: <Download className="h-6 w-6" />,
    link: "/roi-calculator",
    time: "5 min"
  }
]

const categories = [
  {
    title: "Kom i gang",
    description: "Alt du behøver for at starte med Autorykker",
    icon: "🚀",
    links: [
      { title: "Opsætning guide", href: "/guider/opsaetning" },
      { title: "Første påmindelser", href: "/guider/foerste-paamindelser" },
      { title: "Integration setup", href: "/guider/integration" }
    ]
  },
  {
    title: "Avancerede funktioner",
    description: "Udnyt Autorykkers fulde potentiale",
    icon: "⚡",
    links: [
      { title: "Automatisering", href: "/guider/automatisering" },
      { title: "Rapportering", href: "/guider/rapportering" },
      { title: "AI optimering", href: "/guider/ai-optimering" }
    ]
  },
  {
    title: "Juridisk & compliance",
    description: "Forstå regler og best practices",
    icon: "⚖️",
    links: [
      { title: "Inkassoloven", href: "/blog/inkassoloven" },
      { title: "GDPR compliance", href: "/blog/gdpr" },
      { title: "Betalingsbetingelser", href: "/blog/betalingsbetingelser" }
    ]
  },
  {
    title: "Udvikler ressourcer",
    description: "API, webhooks og integrationer",
    icon: "💻",
    links: [
      { title: "API dokumentation", href: "/api" },
      { title: "Webhook guide", href: "/api/webhooks" },
      { title: "SDK downloads", href: "/api/sdks" }
    ]
  }
]

export default function RessourcerPage() {
  return (
    <>
      <PageHero 
        title="Ressourcer"
        subtitle="Guides, tutorials og værktøjer til at hjælpe dig med at få mest muligt ud af Autorykker."
      />
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {/* Featured Resources */}
          <div className="mb-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-navy mb-6">
                Populære ressourcer
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Start her for at få maksimal værdi ud af Autorykker.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {resources.map((resource, index) => (
                <Link 
                  key={index}
                  href={resource.link}
                  className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-lime rounded-lg flex items-center justify-center mr-3">
                        {resource.icon}
                      </div>
                      <span className="text-sm font-medium text-gray-500">{resource.type}</span>
                    </div>
                    <span className="text-sm text-gray-400">{resource.time}</span>
                  </div>
                  <h3 className="text-lg font-bold text-navy mb-3 group-hover:text-lime transition-colors">
                    {resource.title}
                  </h3>
                  <p className="text-gray-600 mb-4">{resource.description}</p>
                  <div className="flex items-center text-navy font-medium">
                    Læs mere
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Resource Categories */}
          <div className="mb-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-navy mb-6">
                Ressourcer efter kategori
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Find præcis det du leder efter organiseret i kategorier.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {categories.map((category, index) => (
                <div key={index} className="bg-white rounded-2xl border border-gray-200 p-8">
                  <div className="flex items-center mb-6">
                    <div className="text-3xl mr-4">{category.icon}</div>
                    <div>
                      <h3 className="text-xl font-bold text-navy">{category.title}</h3>
                      <p className="text-gray-600">{category.description}</p>
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {category.links.map((link, idx) => (
                      <li key={idx}>
                        <Link 
                          href={link.href}
                          className="flex items-center text-gray-700 hover:text-navy transition-colors group"
                        >
                          <ArrowRight className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform" />
                          {link.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Help Section */}
          <div className="bg-gray-50 rounded-2xl p-8 mb-20">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-navy mb-6">
                Har du brug for hjælp?
              </h2>
              <p className="text-xl text-gray-600">
                Vores supportteam er klar til at hjælpe dig med alt fra opsætning til avancerede funktioner.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link 
                href="/support"
                className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow group"
              >
                <div className="w-16 h-16 bg-lime rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-8 w-8 text-navy" />
                </div>
                <h3 className="font-bold text-navy mb-2 group-hover:text-lime transition-colors">Live Chat</h3>
                <p className="text-gray-600 text-sm">Få øjeblikkelig hjælp fra vores supportteam</p>
              </Link>

              <Link 
                href="/kontakt"
                className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow group"
              >
                <div className="w-16 h-16 bg-lime rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-navy font-bold text-2xl">📧</span>
                </div>
                <h3 className="font-bold text-navy mb-2 group-hover:text-lime transition-colors">Email Support</h3>
                <p className="text-gray-600 text-sm">Send os dine spørgsmål og få svar inden for 2 timer</p>
              </Link>

              <Link 
                href="/kontakt"
                className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow group"
              >
                <div className="w-16 h-16 bg-lime rounded-full flex items-center justify-center mx-auto mb-4">
                  <Video className="h-8 w-8 text-navy" />
                </div>
                <h3 className="font-bold text-navy mb-2 group-hover:text-lime transition-colors">Book Demo</h3>
                <p className="text-gray-600 text-sm">Få en personlig gennemgang af Autorykker</p>
              </Link>
            </div>
          </div>

          {/* Newsletter Signup */}
          <div className="bg-navy text-white rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold mb-6">
              Hold dig opdateret
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Få de nyeste guides, tips og produktopdateringer direkte i din indbakke.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <Link 
                href="/kontakt"
                className="bg-lime text-navy font-bold px-8 py-3 rounded-xl hover:scale-105 transition-transform"
              >
                Kontakt os for at tilmelde
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
