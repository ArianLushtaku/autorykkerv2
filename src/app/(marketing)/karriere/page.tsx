import PageHero from '@/components/marketing/PageHero'

const jobOpenings = [
  {
    title: "Senior Frontend Developer",
    department: "Engineering",
    location: "København / Remote",
    type: "Fuldtid",
    description: "Vi søger en erfaren frontend developer til at hjælpe med at bygge næste generation af Autorykker.",
    requirements: ["5+ års erfaring med React/Next.js", "TypeScript ekspertise", "UX/UI forståelse"]
  },
  {
    title: "Customer Success Manager",
    department: "Customer Success",
    location: "Aarhus",
    type: "Fuldtid", 
    description: "Hjælp vores kunder med at få maksimal værdi ud af Autorykker og byg langvarige relationer.",
    requirements: ["3+ års erfaring med B2B kundeservice", "Stærke kommunikationsevner", "Problemløsningsmentalitet"]
  },
  {
    title: "Marketing Specialist",
    department: "Marketing",
    location: "København",
    type: "Fuldtid",
    description: "Led vores marketing indsats og hjælp med at sprede budskabet om Autorykker til flere virksomheder.",
    requirements: ["Digital marketing erfaring", "Content creation skills", "Analytisk mindset"]
  }
]

const benefits = [
  {
    icon: "💰",
    title: "Konkurrencedygtig løn",
    description: "Vi tilbyder markedsførende lønninger og aktieoptioner"
  },
  {
    icon: "🏠",
    title: "Fleksibel arbejdsplads",
    description: "Arbejd hjemmefra eller på kontoret - du bestemmer"
  },
  {
    icon: "📚",
    title: "Læring & udvikling",
    description: "Budget til kurser, konferencer og personlig udvikling"
  },
  {
    icon: "🏥",
    title: "Sundhed & trivsel",
    description: "Fuld sundhedsforsikring og wellness-fordele"
  },
  {
    icon: "🌴",
    title: "Ferie & frihed",
    description: "6 ugers ferie plus fleksible fridage"
  },
  {
    icon: "🚀",
    title: "Innovation",
    description: "20% tid til egne projekter og innovation"
  }
]

export default function KarrierePage() {
  return (
    <>
      <PageHero 
        title="Karriere hos Autorykker"
        subtitle="Bliv en del af teamet der revolutionerer debitorstyring i Danmark. Vi søger passionerede mennesker der vil gøre en forskel."
        showCTA={true}
        ctaText="Se ledige stillinger"
        ctaLink="#jobs"
      />
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {/* Culture Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-20">
            <div>
              <h2 className="text-3xl font-bold text-navy mb-6">Vores kultur</h2>
              <p className="text-gray-600 mb-6 text-lg">
                Hos Autorykker tror vi på, at de bedste resultater kommer fra et miljø hvor alle trives. 
                Vi værdsætter diversitet, kreativitet og samarbejde.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <span className="w-6 h-6 bg-lime rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-navy text-sm font-bold">✓</span>
                  </span>
                  <span className="text-gray-600">Åben og transparent kommunikation</span>
                </li>
                <li className="flex items-center">
                  <span className="w-6 h-6 bg-lime rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-navy text-sm font-bold">✓</span>
                  </span>
                  <span className="text-gray-600">Kontinuerlig læring og udvikling</span>
                </li>
                <li className="flex items-center">
                  <span className="w-6 h-6 bg-lime rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-navy text-sm font-bold">✓</span>
                  </span>
                  <span className="text-gray-600">Work-life balance</span>
                </li>
                <li className="flex items-center">
                  <span className="w-6 h-6 bg-lime rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-navy text-sm font-bold">✓</span>
                  </span>
                  <span className="text-gray-600">Mulighed for at påvirke produktets retning</span>
                </li>
              </ul>
            </div>
            <div className="bg-gray-100 rounded-2xl p-8 text-center">
              <div className="text-6xl mb-4">🏢</div>
              <h3 className="text-xl font-bold text-navy mb-4">Moderne arbejdsplads</h3>
              <p className="text-gray-600">
                Vores kontorer i København og Aarhus er designet til at fremme kreativitet og samarbejde.
              </p>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-navy text-center mb-12">Fordele ved at arbejde hos os</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
                  <div className="text-4xl mb-4">{benefit.icon}</div>
                  <h3 className="text-xl font-bold text-navy mb-3">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Job Openings */}
          <div className="mb-20" id="jobs">
            <h2 className="text-3xl font-bold text-navy text-center mb-12">Ledige stillinger</h2>
            <div className="space-y-6">
              {jobOpenings.map((job, index) => (
                <div key={index} className="bg-white rounded-2xl border border-gray-200 p-8">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-navy mb-2">{job.title}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span className="bg-gray-100 px-3 py-1 rounded-full">{job.department}</span>
                        <span className="bg-gray-100 px-3 py-1 rounded-full">{job.location}</span>
                        <span className="bg-gray-100 px-3 py-1 rounded-full">{job.type}</span>
                      </div>
                    </div>
                    <a 
                      href={`mailto:karriere@autorykker.dk?subject=Ansøgning: ${job.title}`}
                      className="inline-block bg-lime text-navy font-bold px-6 py-3 rounded-xl hover:scale-105 transition-transform mt-4 lg:mt-0"
                    >
                      Ansøg nu
                    </a>
                  </div>
                  
                  <p className="text-gray-600 mb-6">{job.description}</p>
                  
                  <div>
                    <h4 className="font-bold text-navy mb-3">Krav:</h4>
                    <ul className="space-y-2">
                      {job.requirements.map((req, reqIndex) => (
                        <li key={reqIndex} className="flex items-center">
                          <span className="w-2 h-2 bg-lime rounded-full mr-3 flex-shrink-0"></span>
                          <span className="text-gray-600">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Application Process */}
          <div className="bg-gray-50 rounded-2xl p-8 mb-20">
            <h2 className="text-3xl font-bold text-navy text-center mb-8">Ansøgningsprocessen</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-lime rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-navy font-bold text-xl">1</span>
                </div>
                <h3 className="font-bold text-navy mb-2">Ansøgning</h3>
                <p className="text-gray-600">Send din ansøgning og CV</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-lime rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-navy font-bold text-xl">2</span>
                </div>
                <h3 className="font-bold text-navy mb-2">Screening</h3>
                <p className="text-gray-600">Kort telefonsamtale</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-lime rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-navy font-bold text-xl">3</span>
                </div>
                <h3 className="font-bold text-navy mb-2">Interview</h3>
                <p className="text-gray-600">Møde med teamet</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-lime rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-navy font-bold text-xl">4</span>
                </div>
                <h3 className="font-bold text-navy mb-2">Tilbud</h3>
                <p className="text-gray-600">Velkommen til teamet!</p>
              </div>
            </div>
          </div>

          {/* Contact CTA */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-navy mb-6">
              Ser du ikke den rigtige stilling?
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Vi er altid interesserede i at høre fra talentfulde mennesker. Send os en uopfordret ansøgning.
            </p>
            <a 
              href="mailto:jobs@autorykker.dk"
              className="bg-lime text-navy font-bold px-8 py-4 rounded-xl hover:scale-105 transition-transform"
            >
              Send uopfordret ansøgning
            </a>
          </div>
        </div>
      </main>
    </>
  )
}
