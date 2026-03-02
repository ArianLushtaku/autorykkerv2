import PageHero from '@/components/marketing/PageHero'
import Link from 'next/link'

export default function TermsPage() {
  return (
    <>
      <PageHero 
        title="Handelsbetingelser"
        subtitle="Læs vores handelsbetingelser for brug af Autorykker platformen og tjenester."
      />
      <main>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          
          <div className="prose prose-lg max-w-none">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
              <p className="text-blue-800 mb-0">
                <strong>Sidst opdateret:</strong> 15. december 2024
              </p>
            </div>

            <h2 className="text-2xl font-bold text-navy mb-6">1. Acceptering af betingelser</h2>
            <p className="text-gray-700 mb-6">
              Ved at tilgå eller bruge Autorykker tjenesten (&quot;Tjenesten&quot;) accepterer du at være bundet af disse handelsbetingelser (&quot;Betingelser&quot;). 
              Hvis du ikke accepterer alle betingelserne, må du ikke bruge Tjenesten.
            </p>

            <h2 className="text-2xl font-bold text-navy mb-6">2. Beskrivelse af tjenesten</h2>
            <p className="text-gray-700 mb-6">
              Autorykker er en cloud-baseret platform til automatisering af debitorstyring og inkassoprocesser. 
              Tjenesten inkluderer funktioner som automatiske påmindelser, rapportering, integrationer og API adgang.
            </p>

            <h2 className="text-2xl font-bold text-navy mb-6">3. Kontoregistrering</h2>
            <h3 className="text-xl font-semibold text-navy mb-4">3.1 Krav til registrering</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>Du skal være mindst 18 år gammel</li>
              <li>Du skal repræsentere en lovlig virksomhed</li>
              <li>Du skal give nøjagtige og fuldstændige oplysninger</li>
              <li>Du er ansvarlig for at holde dine kontooplysninger opdaterede</li>
            </ul>

            <h3 className="text-xl font-semibold text-navy mb-4">3.2 Kontosikkerhed</h3>
            <p className="text-gray-700 mb-6">
              Du er ansvarlig for at beskytte dit password og al aktivitet på din konto. 
              Du skal straks underrette os om enhver uautoriseret brug af din konto.
            </p>

            <h2 className="text-2xl font-bold text-navy mb-6">4. Acceptable brug</h2>
            <h3 className="text-xl font-semibold text-navy mb-4">4.1 Tilladte aktiviteter</h3>
            <p className="text-gray-700 mb-4">Du må bruge Tjenesten til:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>Lovlig debitorstyring og inkassoaktiviteter</li>
              <li>Automatisering af betalingspåmindelser</li>
              <li>Rapportering og analyse af tilgodehavender</li>
              <li>Integration med dine eksisterende systemer</li>
            </ul>

            <h3 className="text-xl font-semibold text-navy mb-4">4.2 Forbudte aktiviteter</h3>
            <p className="text-gray-700 mb-4">Du må IKKE bruge Tjenesten til:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>Ulovlige aktiviteter eller krænkelse af andres rettigheder</li>
              <li>Chikane, trusler eller krænkende kommunikation</li>
              <li>Spam eller uopfordret markedsføring</li>
              <li>At omgå sikkerhedsforanstaltninger</li>
              <li>At dele din konto med uautoriserede personer</li>
            </ul>

            <h2 className="text-2xl font-bold text-navy mb-6">5. Betaling og abonnement</h2>
            <h3 className="text-xl font-semibold text-navy mb-4">5.1 Priser og betalingsbetingelser</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>Priser er angivet på vores hjemmeside og kan ændres med 30 dages varsel</li>
              <li>Betaling sker månedligt eller årligt forud</li>
              <li>Alle priser er ekskl. moms</li>
              <li>Betalinger er ikke-refunderbare medmindre andet er angivet</li>
            </ul>

            <h3 className="text-xl font-semibold text-navy mb-4">5.2 Gratis prøveperiode</h3>
            <p className="text-gray-700 mb-6">
              Vi tilbyder en 14-dages gratis prøveperiode for nye kunder. 
              Efter prøveperioden vil dit abonnement automatisk fortsætte medmindre du opsiger det.
            </p>

            <h3 className="text-xl font-semibold text-navy mb-4">5.3 Opsigelse</h3>
            <p className="text-gray-700 mb-6">
              Du kan opsige dit abonnement når som helst med 30 dages varsel. 
              Opsigelse træder i kraft ved udgangen af den aktuelle faktureringsperiode.
            </p>

            <h2 className="text-2xl font-bold text-navy mb-6">6. Data og privatliv</h2>
            <p className="text-gray-700 mb-6">
              Vores håndtering af dine personlige oplysninger er beskrevet i vores{' '}
              <Link href="/privacy" className="text-lime hover:text-navy transition-colors">
                privatlivspolitik
              </Link>. 
              Ved at bruge Tjenesten accepterer du også vores privatlivspolitik.
            </p>

            <h2 className="text-2xl font-bold text-navy mb-6">7. Intellektuelle rettigheder</h2>
            <h3 className="text-xl font-semibold text-navy mb-4">7.1 Vores rettigheder</h3>
            <p className="text-gray-700 mb-6">
              Autorykker og alle relaterede varemærker, logoer og indhold er vores ejendom eller licenseret til os. 
              Du må ikke kopiere, modificere eller distribuere vores indhold uden skriftlig tilladelse.
            </p>

            <h3 className="text-xl font-semibold text-navy mb-4">7.2 Dine rettigheder</h3>
            <p className="text-gray-700 mb-6">
              Du beholder alle rettigheder til de data du uploader til Tjenesten. 
              Du giver os licens til at behandle dine data som nødvendigt for at levere Tjenesten.
            </p>

            <h2 className="text-2xl font-bold text-navy mb-6">8. Ansvarsfraskrivelse</h2>
            <p className="text-gray-700 mb-6">
              Tjenesten leveres &quot;som den er&quot; uden garantier af nogen art. 
              Vi garanterer ikke, at Tjenesten vil være fejlfri eller altid tilgængelig. 
              Du bruger Tjenesten på egen risiko.
            </p>

            <h2 className="text-2xl font-bold text-navy mb-6">9. Ansvarsbegrænsning</h2>
            <p className="text-gray-700 mb-6">
              Vores samlede ansvar over for dig kan ikke overstige det beløb du har betalt for Tjenesten i de seneste 12 måneder. 
              Vi er ikke ansvarlige for indirekte skader, tabt profit eller driftstab.
            </p>

            <h2 className="text-2xl font-bold text-navy mb-6">10. Suspension og opsigelse</h2>
            <p className="text-gray-700 mb-6">
              Vi kan suspendere eller opsige din adgang til Tjenesten hvis du overtræder disse Betingelser, 
              ikke betaler rettidigt, eller hvis vi har grund til at tro, at du bruger Tjenesten til ulovlige formål.
            </p>

            <h2 className="text-2xl font-bold text-navy mb-6">11. Ændringer til betingelser</h2>
            <p className="text-gray-700 mb-6">
              Vi kan ændre disse Betingelser fra tid til anden. 
              Væsentlige ændringer vil blive kommunikeret med mindst 30 dages varsel. 
              Fortsat brug af Tjenesten efter ændringer udgør accept af de nye betingelser.
            </p>

            <h2 className="text-2xl font-bold text-navy mb-6">12. Gældende lov og tvister</h2>
            <p className="text-gray-700 mb-6">
              Disse Betingelser er underlagt dansk lov. 
              Eventuelle tvister skal løses ved danske domstole med København som værneting.
            </p>

            <h2 className="text-2xl font-bold text-navy mb-6">13. Kontaktoplysninger</h2>
            <p className="text-gray-700 mb-4">
              Hvis du har spørgsmål til disse Betingelser, kan du kontakte os:
            </p>
            <div className="bg-gray-50 rounded-xl p-6">
              <p className="text-gray-700 mb-2"><strong>Autorykker ApS</strong></p>
              <p className="text-gray-700 mb-2">Vesterbrogade 123, 1620 København V</p>
              <p className="text-gray-700 mb-2">Email: legal@autorykker.dk</p>
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
