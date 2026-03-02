import PageHero from '@/components/marketing/PageHero'
import ContactForm from './ContactForm'

export default function KontaktPage() {
  return (
    <>
      <PageHero 
        title="Kontakt os"
        subtitle="Vi er klar til at hjælpe dig med at komme i gang med Autorykker. Kontakt os i dag for en uforpligtende snak."
        showCTA={true}
        ctaText="Book demo"
        ctaLink="/demo"
      />
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Contact Form */}
            <ContactForm />

            {/* Contact Information */}
            <div className="space-y-8">
              <div className="bg-white rounded-2xl border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-navy mb-6">Kontaktoplysninger</h2>
                
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-lime rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                      <span className="text-navy font-bold">📍</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-navy mb-1">Adresse</h3>
                      <p className="text-gray-600">
                        Autorykker ApS<br />
                        Vesterbrogade 123<br />
                        1620 København V
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-lime rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                      <span className="text-navy font-bold">📞</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-navy mb-1">Telefon</h3>
                      <p className="text-gray-600">+45 70 12 34 56</p>
                      <p className="text-sm text-gray-500">Hverdage 9:00 - 17:00</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-lime rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                      <span className="text-navy font-bold">📧</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-navy mb-1">Email</h3>
                      <p className="text-gray-600">hej@autorykker.dk</p>
                      <p className="text-sm text-gray-500">Vi svarer inden for 2 timer</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
