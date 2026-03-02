import PageHero from '@/components/marketing/PageHero'
import Link from 'next/link'

export default function CookiesPage() {
  return (
    <>
      <PageHero 
        title="Cookie Politik"
        subtitle="Læs hvordan Autorykker bruger cookies og lignende teknologier på vores website."
      />
      <main>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          
          <div className="prose prose-lg max-w-none">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
              <p className="text-blue-800 mb-0">
                <strong>Sidst opdateret:</strong> 15. december 2024
              </p>
            </div>

            <h2 className="text-2xl font-bold text-navy mb-6">1. Hvad er cookies?</h2>
            <p className="text-gray-700 mb-6">
              Cookies er små tekstfiler, der gemmes på din computer eller mobile enhed, når du besøger et website. 
              De hjælper websites med at huske dine præferencer og forbedre din brugeroplevelse.
            </p>

            <h2 className="text-2xl font-bold text-navy mb-6">2. Hvordan bruger vi cookies?</h2>
            <p className="text-gray-700 mb-6">
              Vi bruger cookies til at forbedre funktionaliteten af vores website, analysere trafik og personalisere indhold. 
              Alle cookies vi bruger er nødvendige for at levere vores tjenester eller forbedre din oplevelse.
            </p>

            <h2 className="text-2xl font-bold text-navy mb-6">3. Typer af cookies vi bruger</h2>
            
            <h3 className="text-xl font-semibold text-navy mb-4">3.1 Strengt nødvendige cookies</h3>
            <p className="text-gray-700 mb-4">
              Disse cookies er essentielle for at websitet kan fungere korrekt. De kan ikke deaktiveres.
            </p>
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-semibold text-navy">Cookie navn</th>
                    <th className="text-left py-2 font-semibold text-navy">Formål</th>
                    <th className="text-left py-2 font-semibold text-navy">Varighed</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr className="border-b border-gray-100">
                    <td className="py-2">session_id</td>
                    <td className="py-2">Opretholder din login session</td>
                    <td className="py-2">Session</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2">csrf_token</td>
                    <td className="py-2">Beskytter mod CSRF angreb</td>
                    <td className="py-2">Session</td>
                  </tr>
                  <tr>
                    <td className="py-2">cookie_consent</td>
                    <td className="py-2">Husker dine cookie præferencer</td>
                    <td className="py-2">1 år</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-semibold text-navy mb-4">3.2 Funktionelle cookies</h3>
            <p className="text-gray-700 mb-4">
              Disse cookies gør det muligt for websitet at huske valg du træffer og give forbedrede funktioner.
            </p>
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-semibold text-navy">Cookie navn</th>
                    <th className="text-left py-2 font-semibold text-navy">Formål</th>
                    <th className="text-left py-2 font-semibold text-navy">Varighed</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr className="border-b border-gray-100">
                    <td className="py-2">user_preferences</td>
                    <td className="py-2">Husker dine indstillinger</td>
                    <td className="py-2">6 måneder</td>
                  </tr>
                  <tr>
                    <td className="py-2">language</td>
                    <td className="py-2">Husker dit sprogvalg</td>
                    <td className="py-2">1 år</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-semibold text-navy mb-4">3.3 Analytiske cookies</h3>
            <p className="text-gray-700 mb-4">
              Disse cookies hjælper os med at forstå, hvordan besøgende bruger websitet, så vi kan forbedre det.
            </p>
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-semibold text-navy">Cookie navn</th>
                    <th className="text-left py-2 font-semibold text-navy">Formål</th>
                    <th className="text-left py-2 font-semibold text-navy">Varighed</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr className="border-b border-gray-100">
                    <td className="py-2">_ga</td>
                    <td className="py-2">Google Analytics - bruger identifikation</td>
                    <td className="py-2">2 år</td>
                  </tr>
                  <tr>
                    <td className="py-2">_gid</td>
                    <td className="py-2">Google Analytics - session identifikation</td>
                    <td className="py-2">24 timer</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 className="text-2xl font-bold text-navy mb-6">4. Tredjepartscookies</h2>
            <p className="text-gray-700 mb-6">
              Vi bruger nogle tjenester fra tredjeparter, som kan sætte deres egne cookies. 
              Disse inkluderer Google Analytics for webanalyse og Stripe for betalingsbehandling.
            </p>

            <h2 className="text-2xl font-bold text-navy mb-6">5. Sådan administrerer du cookies</h2>
            
            <h3 className="text-xl font-semibold text-navy mb-4">5.1 Browser indstillinger</h3>
            <p className="text-gray-700 mb-4">
              Du kan kontrollere og/eller slette cookies som du ønsker. Du kan slette alle cookies, der allerede er på din computer, 
              og du kan indstille de fleste browsere til at forhindre, at de bliver placeret.
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li><strong>Chrome:</strong> Indstillinger → Avanceret → Privatliv og sikkerhed → Cookies</li>
              <li><strong>Firefox:</strong> Indstillinger → Privatliv og sikkerhed → Cookies og webstedsdata</li>
              <li><strong>Safari:</strong> Præferencer → Privatliv → Cookies og webstedsdata</li>
              <li><strong>Edge:</strong> Indstillinger → Cookies og webstedstilladelser</li>
            </ul>

            <h3 className="text-xl font-semibold text-navy mb-4">5.2 Cookie banner</h3>
            <p className="text-gray-700 mb-6">
              Når du første gang besøger vores website, vil du se et cookie banner, hvor du kan vælge, 
              hvilke typer cookies du vil acceptere. Du kan ændre dine præferencer når som helst.
            </p>

            <h2 className="text-2xl font-bold text-navy mb-6">6. Konsekvenser af at deaktivere cookies</h2>
            <p className="text-gray-700 mb-6">
              Hvis du vælger at deaktivere cookies, kan det påvirke funktionaliteten af vores website. 
              Nogle funktioner vil muligvis ikke fungere korrekt, og din brugeroplevelse kan blive forringet.
            </p>

            <h2 className="text-2xl font-bold text-navy mb-6">7. Opdateringer til denne politik</h2>
            <p className="text-gray-700 mb-6">
              Vi kan opdatere denne cookie politik fra tid til anden for at afspejle ændringer i vores brug af cookies 
              eller af juridiske årsager. Vi opfordrer dig til at gennemgå denne side regelmæssigt.
            </p>

            <h2 className="text-2xl font-bold text-navy mb-6">8. Kontakt os</h2>
            <p className="text-gray-700 mb-4">
              Hvis du har spørgsmål om vores brug af cookies, kan du kontakte os:
            </p>
            <div className="bg-gray-50 rounded-xl p-6">
              <p className="text-gray-700 mb-2"><strong>Autorykker ApS</strong></p>
              <p className="text-gray-700 mb-2">Vesterbrogade 123, 1620 København V</p>
              <p className="text-gray-700 mb-2">Email: privacy@autorykker.dk</p>
              <p className="text-gray-700 mb-2">Telefon: +45 70 12 34 56</p>
              <p className="text-gray-700">CVR: 12345678</p>
            </div>
          </div>

          <div className="mt-12 text-center flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/kontakt"
              className="bg-lime text-navy font-bold px-8 py-4 rounded-xl hover:scale-105 transition-transform"
            >
              Kontakt os om cookies
            </Link>
            <Link 
              href="/privatlivspolitik"
              className="border-2 border-navy text-navy font-bold px-8 py-4 rounded-xl hover:scale-105 transition-transform"
            >
              Privatlivspolitik
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
