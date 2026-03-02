'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'

export default function Navigation() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)

  useEffect(() => {
    const handleScroll = () => {
      const maxScroll = 300 // adjust how quickly transition finishes
      const scrollTop = window.scrollY
      const progress = Math.min(scrollTop / maxScroll, 1)
      setScrollProgress(progress)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // interpolate from navy to white
  const navyR = 13, navyG = 0, navyB = 140; // #0D008C (matches Tailwind navy color)
  const whiteR = 255, whiteG = 255, whiteB = 255;
  
  const bgR = navyR + (whiteR - navyR) * scrollProgress;
  const bgG = navyG + (whiteG - navyG) * scrollProgress;
  const bgB = navyB + (whiteB - navyB) * scrollProgress;
  
  const shadowStrength = scrollProgress * 0.3; // 0 to 0.3 shadow opacity

  return (
    <nav
      className="sticky top-0 z-50 transition-all duration-75"
      style={{
        backgroundColor: `rgb(${bgR}, ${bgG}, ${bgB})`,
        boxShadow: `0 4px 12px rgba(0,0,0,${shadowStrength})`,
        backdropFilter: `blur(${scrollProgress * 8}px)`,
        transition: 'background-color 0.1s linear, box-shadow 0.1s linear, backdrop-filter 0.1s linear',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-24 items-center">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/autorykker.png"
                alt="Autorykker logo"
                width={40}
                height={40}
                className="h-10 w-auto transition-all duration-300"
                style={{
                  filter: scrollProgress < 1 
                    ? 'drop-shadow(-1px -1px 0 white) drop-shadow(1px -1px 0 white) drop-shadow(-1px 1px 0 white) drop-shadow(1px 1px 0 white)'
                    : 'none'
                }}
              />
              <span
                className="text-2xl font-bold ml-2 transition-colors duration-300"
                style={{
                  color: `rgb(${255 - scrollProgress * (255 - navyR)}, ${255 - scrollProgress * (255 - navyG)}, ${255 - scrollProgress * (255 - navyB)})`,
                  textShadow: scrollProgress < 0.5 ? '1px 1px 2px rgba(0,0,0,0.5)' : 'none'
                }}
              >
                Autorykker
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            {['produkt','priser','integrationer','ressourcer','login'].map((link) => (
              <Link
                key={link}
                href={`/${link}`}
                className="transition-colors duration-300 font-semibold"
                style={{
                  color: `rgb(${255 - scrollProgress * (255 - navyR)}, ${255 - scrollProgress * (255 - navyG)}, ${255 - scrollProgress * (255 - navyB)})`,
                  textShadow: scrollProgress < 0.5 ? '1px 1px 2px rgba(0,0,0,0.5)' : 'none'
                }}
              >
                {link.charAt(0).toUpperCase() + link.slice(1)}
              </Link>
            ))}
            <Link
              href="/signup"
              className="bg-lime text-navy font-bold px-6 py-3 rounded-xl hover:scale-105 transition-transform"
            >
              Kom i gang
            </Link>
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMobileMenu}
              className="focus:outline-none transition-colors duration-300"
              style={{
                color: `rgb(${255 - scrollProgress * (255 - navyR)}, ${255 - scrollProgress * (255 - navyG)}, ${255 - scrollProgress * (255 - navyB)})`,
              }}
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div
          className="md:hidden transition-colors duration-300"
          style={{
            backgroundColor: `rgb(${bgR}, ${bgG}, ${bgB})`,
          }}
        >
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {['produkt','priser','integrationer','ressourcer','login'].map((link) => (
              <Link
                key={link}
                href={`/${link}`}
                className="block px-3 py-2 rounded-md text-base font-semibold transition-colors duration-300"
                style={{
                  color: `rgb(${255 - scrollProgress * (255 - navyR)}, ${255 - scrollProgress * (255 - navyG)}, ${255 - scrollProgress * (255 - navyB)})`,
                }}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.charAt(0).toUpperCase() + link.slice(1)}
              </Link>
            ))}
            <Link
              href="/signup"
              className="bg-lime text-navy font-bold block px-3 py-3 rounded-xl text-center"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Kom i gang
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
