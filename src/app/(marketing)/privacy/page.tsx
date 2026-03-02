import PageHero from '@/components/marketing/PageHero'
import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <>
      <PageHero 
        title="Privatlivspolitik"
        subtitle="Læs hvordan Autorykker indsamler, bruger og beskytter dine personlige oplysninger."
      />
      <main>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          
          <div className="prose prose-lg max-w-none">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
              <p className="text-blue-800 mb-0">
                <strong>Sidst opdateret:</strong> 15. december 2024
              </p>
            </div>

            <h2 className="text-2xl font-bold text-navy mb-6">1. Introduktion</h2>
            <p className="text-gray-700 mb-6">
              Autorykker ApS (&quot;vi&quot;, &quot;os&quot;, &quot;vores&quot;) respekterer dit privatliv og er forpligtet til at beskytte dine personlige oplysninger. 
              Denne privatlivspolitik forklarer, hvordan vi indsamler, bruger, deler og beskytter oplysninger om dig, når du bruger vores tjenester.
            </p>

            <h2 className="text-2xl font-bold text-navy mb-6">2. Oplysninger vi indsamler</h2>
            
            <h3 className="text-xl font-semibold text-navy mb-4">2.1 Oplysninger du giver os</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>Kontaktoplysninger (navn, email, telefonnummer)</li>
              <li>Virksomhedsoplysninger (CVR-nummer, adresse)</li>
              <li>Betalingsoplysninger (faktureringsadresse, betalingsmetode)</li>
              <li>Kundedata du uploader til platformen</li>
            </ul>

            <h3 className="text-xl font-semibold text-navy mb-4">2.2 Oplysninger vi indsamler automatisk</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>Brugsdata (hvordan du bruger vores tjenester)</li>
              <li>Tekniske oplysninger (IP-adresse, browsertype, enhedsoplysninger)</li>
              <li>Cookies og lignende teknologier</li>
            </ul>

            <h2 className="text-2xl font-bold text-navy mb-6">3. Hvordan vi bruger dine oplysninger</h2>
            <p className="text-gray-700 mb-4">Vi bruger dine oplysninger til at:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>Levere og vedligeholde vores tjenester</li>
              <li>Behandle betalinger og administrere din konto</li>
              <li>Kommunikere med dig om tjenesten</li>
              <li>Forbedre vores tjenester og udvikle nye funktioner</li>
              <li>Overholde juridiske forpligtelser</li>
              <li>Beskytte mod svindel og misbrug</li>
            </ul>

            <h2 className="text-2xl font-bold text-navy mb-6">4. Deling af oplysninger</h2>
            <p className="text-gray-700 mb-4">Vi deler ikke dine personlige oplysninger med tredjeparter, undtagen:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>Med dit samtykke</li>
              <li>Med tjenesteudbydere der hjælper os med at levere vores tjenester</li>
              <li>Når det kræves af loven</li>
              <li>For at beskytte vores rettigheder og sikkerhed</li>
            </ul>

            <h2 className="text-2xl font-bold text-navy mb-6">5. Datasikkerhed</h2>
            <p className="text-gray-700 mb-6">
              Vi implementerer passende tekniske og organisatoriske foranstaltninger for at beskytte dine personlige oplysninger mod 
              uautoriseret adgang, ændring, videregivelse eller ødelæggelse. Dette inkluderer kryptering, adgangskontrol og regelmæssige sikkerhedsaudits.
            </p>

            <h2 className="text-2xl font-bold text-navy mb-6">6. Dataopbevaring</h2>
            <p className="text-gray-700 mb-6">
              Vi opbevarer dine personlige oplysninger så længe det er nødvendigt for at levere vores tjenester eller overholde juridiske forpligtelser. 
              Når du sletter din konto, vil vi slette eller anonymisere dine personlige oplysninger inden for 30 dage.
            </p>

            <h2 className="text-2xl font-bold text-navy mb-6">7. Dine rettigheder</h2>
            <p className="text-gray-700 mb-4">Under GDPR har du følgende rettigheder:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li><strong>Ret til indsigt:</strong> Du kan anmode om en kopi af dine personlige oplysninger</li>
              <li><strong>Ret til berigtigelse:</strong> Du kan anmode om rettelse af unøjagtige oplysninger</li>
              <li><strong>Ret til sletning:</strong> Du kan anmode om sletning af dine personlige oplysninger</li>
              <li><strong>Ret til begrænsning:</strong> Du kan anmode om begrænsning af behandlingen</li>
              <li><strong>Ret til dataportabilitet:</strong> Du kan anmode om at få dine data i et struktureret format</li>
              <li><strong>Ret til indsigelse:</strong> Du kan gøre indsigelse mod behandlingen af dine oplysninger</li>
            </ul>

            <h2 className="text-2xl font-bold text-navy mb-6">8. Cookies</h2>
            <p className="text-gray-700 mb-6">
              Vi bruger cookies og lignende teknologier til at forbedre din oplevelse på vores website. 
              Du kan læse mere om vores brug af cookies i vores{' '}
              <Link href="/cookies" className="text-lime hover:text-navy transition-colors">
                cookie politik
              </Link>.
            </p>

            <h2 className="text-2xl font-bold text-navy mb-6">9. Internationale overførsler</h2>
            <p className="text-gray-700 mb-6">
              Dine personlige oplysninger kan blive overført til og behandlet i lande uden for EU/EØS. 
              Vi sikrer, at sådanne overførsler sker i overensstemmelse med GDPR og med passende sikkerhedsforanstaltninger.
            </p>

            <h2 className="text-2xl font-bold text-navy mb-6">10. Ændringer til denne politik</h2>
            <p className="text-gray-700 mb-6">
              Vi kan opdatere denne privatlivspolitik fra tid til anden. Vi vil give dig besked om væsentlige ændringer 
              ved at sende en email eller ved at poste en meddelelse på vores website.
            </p>

            <h2 className="text-2xl font-bold text-navy mb-6">11. Kontakt os</h2>
            <p className="text-gray-700 mb-4">
              Hvis du har spørgsmål om denne privatlivspolitik eller ønsker at udøve dine rettigheder, kan du kontakte os:
            </p>
            <div className="bg-gray-50 rounded-xl p-6">
              <p className="text-gray-700 mb-2"><strong>Autorykker ApS</strong></p>
              <p className="text-gray-700 mb-2">Vesterbrogade 123, 1620 København V</p>
              <p className="text-gray-700 mb-2">Email: privacy@autorykker.dk</p>
              <p className="text-gray-700 mb-2">Telefon: +45 70 12 34 56</p>
              <p className="text-gray-700">CVR: 12345678</p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link 
              href="/kontakt"
              className="bg-lime text-navy font-bold px-8 py-4 rounded-xl hover:scale-105 transition-transform"
            >
              Kontakt os ved spørgsmål
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
