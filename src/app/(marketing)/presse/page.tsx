import PageHero from '@/components/marketing/PageHero'
import Link from 'next/link'
import { User, Download, FileText, Image as ImageIcon, Folder } from 'lucide-react'

const pressReleases = [
  {
    id: 'series-a-funding',
    title: "Autorykker rejser 50 millioner kroner i Series A",
    date: "15. december 2024",
    excerpt: "Autorykker har rejst 50 millioner kroner i en Series A-runde ledet af Northzone for at accelerere væksten i det nordiske marked.",
    category: "Funding"
  },
  {
    id: 'ai-inkasso-launch',
    title: "Autorykker lancerer AI-drevet inkassosystem",
    date: "1. december 2024", 
    excerpt: "Ny AI-teknologi kan forudsige betalingsadfærd og optimere inkassostrategier for danske virksomheder.",
    category: "Product"
  },
  {
    id: '500-customers-milestone',
    title: "500+ danske virksomheder bruger nu Autorykker",
    date: "20. november 2024",
    excerpt: "Autorykker passerer milepæl med over 500 kunder og 2 millioner behandlede fakturaer.",
    category: "Milestone"
  }
]

const mediaKit = [
  {
    title: "Autorykker Logo",
    description: "Høj opløsning logo i forskellige formater",
    icon: ImageIcon,
    available: true
  },
  {
    title: "Produktbilleder",
    description: "Screenshots af Autorykker platformen",
    icon: Folder,
    available: false
  },
  {
    title: "Grundlægger fotos",
    description: "Professionelle fotos af ledelsen",
    icon: User,
    available: false
  },
  {
    title: "Faktaark",
    description: "Nøgletal og virksomhedsoplysninger",
    icon: FileText,
    available: false
  }
]

export default function PressePage() {
  return (
    <>
      <PageHero 
        title="Presse"
        subtitle="Nyheder, pressemeddelelser og mediemateriale om Autorykker."
      />
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {/* Latest News */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-navy mb-12">Seneste nyheder</h2>
            <div className="space-y-8">
              {pressReleases.map((release, index) => (
                <article key={index} className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-4 mb-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      release.category === 'Funding' ? 'bg-green-100 text-green-800' :
                      release.category === 'Product' ? 'bg-blue-100 text-blue-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {release.category}
                    </span>
                    <span className="text-gray-500 text-sm">{release.date}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-navy mb-4">
                    {release.title}
                  </h3>
                  <p className="text-gray-600 text-lg mb-6">
                    {release.excerpt}
                  </p>
                  <Link 
                    href="/kontakt"
                    className="inline-block bg-lime text-navy font-bold px-6 py-2 rounded-xl hover:scale-105 transition-transform"
                  >
                    Kontakt os for mere info
                  </Link>
                </article>
              ))}
            </div>
          </div>

          {/* Company Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-20">
            <div>
              <h2 className="text-3xl font-bold text-navy mb-8">Om Autorykker</h2>
              <div className="space-y-6">
                <p className="text-gray-600 text-lg">
                  Autorykker er Danmarks førende platform for automatiseret debitorstyring. 
                  Vi hjælper virksomheder med at optimere deres likviditet gennem intelligent 
                  automatisering af inkassoprocessen.
                </p>
                <p className="text-gray-600 text-lg">
                  Grundlagt i 2023 har Autorykker hurtigt etableret sig som markedsleder 
                  med over 500 kunder og 2+ millioner behandlede fakturaer.
                </p>
                
                <div className="bg-navy rounded-2xl p-6">
                  <h3 className="font-bold text-white mb-4">Nøgletal</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-bold text-lime">500+</div>
                      <div className="text-gray-300">Kunder</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-lime">2M+</div>
                      <div className="text-gray-300">Fakturaer</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-lime">85%</div>
                      <div className="text-gray-300">Reduktion</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-lime">24/7</div>
                      <div className="text-gray-300">Overvågning</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-bold text-navy mb-8">Ledelse</h2>
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-16 h-16 rounded-full mr-4 bg-navy flex items-center justify-center flex-shrink-0">
                      <span className="text-lime text-2xl font-bold">AL</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-navy">Arian Lushtaku</h3>
                      <p className="text-navy/70 font-medium">CEO & Founder</p>
                    </div>
                  </div>
                  <p className="text-gray-600">
                    Erfaren iværksætter med passion for fintech og automatisering.
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-16 h-16 rounded-full mr-4 bg-navy flex items-center justify-center flex-shrink-0">
                      <span className="text-lime text-2xl font-bold">MA</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-navy">Maria Andersen</h3>
                      <p className="text-navy/70 font-medium">CTO</p>
                    </div>
                  </div>
                  <p className="text-gray-600">
                    Tech-ekspert med passion for brugervenlige løsninger.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Media Kit */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-navy text-center mb-4">Mediekit</h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              Download officielle Autorykker materialer til brug i artikler og præsentationer.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {mediaKit.map((item, index) => {
                const IconComponent = item.icon
                return (
                  <div key={index} className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
                    <div className="w-16 h-16 bg-lime rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="w-8 h-8 text-navy" />
                    </div>
                    <h3 className="font-bold text-navy mb-2">{item.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{item.description}</p>
                    {item.available ? (
                      <a 
                        href="/autorykker.png"
                        download="autorykker-logo.png"
                        className="inline-flex items-center gap-2 bg-lime text-navy font-bold px-4 py-2 rounded-xl hover:scale-105 transition-transform text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </a>
                    ) : (
                      <Link 
                        href="/kontakt"
                        className="inline-block bg-gray-100 text-gray-600 font-medium px-4 py-2 rounded-xl hover:bg-gray-200 transition-colors text-sm"
                      >
                        Kontakt os
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Press Contact */}
          <div className="bg-navy text-white rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold mb-6">Pressekontakt</h2>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
              For presseforespørgsler, interviews eller yderligere information, kontakt venligst vores presseteam.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-white bg-opacity-10 rounded-xl p-6">
                <h3 className="font-bold mb-2">Pressekontakt</h3>
                <p className="text-gray-300 mb-4">
                  Sarah Jensen<br />
                  Head of Communications
                </p>
                <div className="space-y-2">
                  <a href="mailto:presse@autorykker.dk" className="block text-lime hover:text-white transition-colors">
                    presse@autorykker.dk
                  </a>
                  <a href="tel:+4570123457" className="block text-lime hover:text-white transition-colors">
                    +45 70 12 34 57
                  </a>
                </div>
              </div>

              <div className="bg-white bg-opacity-10 rounded-xl p-6">
                <h3 className="font-bold mb-2">Investor Relations</h3>
                <p className="text-gray-300 mb-4">
                  Arian Lushtaku<br />
                  CEO & Founder
                </p>
                <div className="space-y-2">
                  <a href="mailto:investor@autorykker.dk" className="block text-lime hover:text-white transition-colors">
                    investor@autorykker.dk
                  </a>
                  <a href="tel:+4570123456" className="block text-lime hover:text-white transition-colors">
                    +45 70 12 34 56
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
