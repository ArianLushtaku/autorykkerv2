import Link from 'next/link'
import { Mail, ArrowUp, ArrowRight } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-white py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div>
            <span className="text-2xl font-bold text-navy">Autorykker</span>
            <p className="text-gray-500 mt-4">
              Automatiser din debitorstyring og optimer din likviditet
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-gray-900 font-bold mb-4">Produkt</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/funktioner" className="text-gray-600 hover:text-navy transition-colors">
                  Funktioner
                </Link>
              </li>
              <li>
                <Link href="/priser" className="text-gray-600 hover:text-navy transition-colors">
                  Priser
                </Link>
              </li>
              <li>
                <Link href="/integrationer" className="text-gray-600 hover:text-navy transition-colors">
                  Integrationer
                </Link>
              </li>
              <li>
                <Link href="/status" className="text-gray-600 hover:text-navy transition-colors">
                  Status
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-gray-900 font-bold mb-4">Ressourcer</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/blog" className="text-gray-600 hover:text-navy transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/guider" className="text-gray-600 hover:text-navy transition-colors">
                  Guider
                </Link>
              </li>
              <li>
                <Link href="/support" className="text-gray-600 hover:text-navy transition-colors">
                  Support
                </Link>
              </li>
              <li>
                <Link href="/api" className="text-gray-600 hover:text-navy transition-colors">
                  API
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-gray-900 font-bold mb-4">Virksomhed</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/om-os" className="text-gray-600 hover:text-navy transition-colors">
                  Om os
                </Link>
              </li>
              <li>
                <Link href="/karriere" className="text-gray-600 hover:text-navy transition-colors">
                  Karriere
                </Link>
              </li>
              <li>
                <Link href="/kontakt" className="text-gray-600 hover:text-navy transition-colors">
                  Kontakt
                </Link>
              </li>
              <li>
                <Link href="/presse" className="text-gray-600 hover:text-navy transition-colors">
                  Presse
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 mt-12 md:mt-16 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            © 2024 Autorykker ApS. Alle rettigheder forbeholdes.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="mailto:kontakt@autorykker.dk" className="text-gray-500 hover:text-navy transition-colors">
              <Mail className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-500 hover:text-navy transition-colors">
              <ArrowUp className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-500 hover:text-navy transition-colors">
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
