import PageHero from '@/components/marketing/PageHero'
import Link from 'next/link'

const guides = [
  {
    title: "Kom i gang med Autorykker",
    description: "En komplet guide til at sætte Autorykker op og komme i gang med automatisk debitorstyring.",
    duration: "15 min",
    difficulty: "Begynder",
    steps: 5
  },
  {
    title: "Opsætning af automatiske påmindelser",
    description: "Lær hvordan du konfigurerer automatiske påmindelser der passer til din virksomhed.",
    duration: "10 min",
    difficulty: "Begynder",
    steps: 4
  },
  {
    title: "Integration med regnskabssystemer",
    description: "Step-by-step guide til at integrere Autorykker med dit regnskabssystem.",
    duration: "20 min",
    difficulty: "Mellem",
    steps: 7
  },
  {
    title: "Avanceret rapportering",
    description: "Udnyt Autorykkers rapporteringsværktøjer til at få dybere indsigt i din debitorstyring.",
    duration: "25 min",
    difficulty: "Avanceret",
    steps: 8
  },
  {
    title: "Optimering af inkassoproces",
    description: "Best practices for at maksimere effektiviteten af din inkassoproces.",
    duration: "30 min",
    difficulty: "Avanceret",
    steps: 10
  },
  {
    title: "Juridiske retningslinjer",
    description: "Forstå de juridiske aspekter ved debitorstyring og inkasso i Danmark.",
    duration: "20 min",
    difficulty: "Mellem",
    steps: 6
  }
]

export default function GuiderPage() {
  return (
    <>
      <PageHero 
        title="Guider"
        subtitle="Step-by-step guider til at hjælpe dig med at få mest muligt ud af Autorykker."
      />
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {guides.map((guide, index) => (
              <div key={index} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    guide.difficulty === 'Begynder' ? 'bg-green-100 text-green-800' :
                    guide.difficulty === 'Mellem' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {guide.difficulty}
                  </span>
                  <span className="text-gray-500 text-sm">{guide.duration}</span>
                </div>
                
                <h3 className="text-xl font-bold text-navy mb-3">
                  {guide.title}
                </h3>
                
                <p className="text-gray-600 mb-4">
                  {guide.description}
                </p>
                
                <div className="flex items-center justify-between mb-6">
                  <span className="text-gray-500 text-sm">
                    {guide.steps} trin
                  </span>
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                      <div className="bg-lime h-2 rounded-full" style={{width: '0%'}}></div>
                    </div>
                    <span className="text-gray-500 text-sm">0%</span>
                  </div>
                </div>
                
                <Link 
                  href={`/guider/${index + 1}`}
                  className="block w-full bg-lime text-navy font-bold py-3 px-6 rounded-xl hover:scale-105 transition-transform text-center"
                >
                  Start guide
                </Link>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 mt-16 text-center">
            <h2 className="text-2xl font-bold text-navy mb-4">
              Har du brug for personlig hjælp?
            </h2>
            <p className="text-gray-600 mb-6">
              Vores supportteam er klar til at hjælpe dig med at komme i gang.
            </p>
            <Link 
              href="/support"
              className="inline-block bg-lime text-navy font-bold px-8 py-4 rounded-xl hover:scale-105 transition-transform"
            >
              Kontakt support
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
