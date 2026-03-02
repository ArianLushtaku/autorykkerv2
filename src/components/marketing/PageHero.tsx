interface PageHeroProps {
  title: string
  subtitle: string
  showCTA?: boolean
  ctaText?: string
  ctaLink?: string
}

export default function PageHero({ 
  title, 
  subtitle, 
  showCTA = false, 
  ctaText = "Kom i gang", 
  ctaLink = "/signup" 
}: PageHeroProps) {
  return (
    <section className="bg-navy text-white pt-32 pb-24 md:pt-40 md:pb-32 relative overflow-hidden">
      {/* Gradient Mesh + Subtle Grid Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient mesh for depth - subtle */}
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-lime/12 via-lime/5 to-transparent blur-3xl"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-lemon/12 via-lemon/5 to-transparent blur-3xl"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-lime/8 rounded-full blur-3xl"></div>
        
        {/* Subtle grid for structure */}
        <div className="absolute inset-0 opacity-5" 
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(195, 255, 0, 0.3) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(195, 255, 0, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px'
          }}
        ></div>
        
        {/* Accent lines - subtle */}
        <div className="absolute bottom-24 left-0 w-full h-px bg-gradient-to-r from-transparent via-lime/20 to-transparent"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white mb-6">
            {title}
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto mb-8">
            {subtitle}
          </p>
          
          {showCTA && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href={ctaLink}
                className="bg-lime text-navy font-bold px-8 py-4 rounded-xl hover:scale-105 transition-transform text-center inline-block"
              >
                {ctaText}
              </a>
              <a 
                href="/demo" 
                className="border-2 border-white text-white font-bold px-8 py-4 rounded-xl hover:scale-105 transition-transform text-center inline-block"
              >
                Se demo
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Wave SVG */}
      <div className="absolute bottom-0 left-0 right-0 h-16 w-full overflow-hidden">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full">
          <path 
            d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" 
            opacity=".25" 
            fill="#F9FAFB"
          />
          <path 
            d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" 
            opacity=".5" 
            fill="#F9FAFB"
          />
          <path 
            d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" 
            fill="#F9FAFB"
          />
        </svg>
      </div>
    </section>
  )
}
