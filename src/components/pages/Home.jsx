'use client'

import { useState, useEffect, useRef } from 'react'

export default function Home({ associations = [] }) {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="relative overflow-hidden">
      {/* Dice pattern background with drift */}
      <div className="absolute inset-0 dice-pattern opacity-30 pointer-events-none pattern-drift" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 pb-16 sm:pb-24">

        {/* Hero - Editorial magazine style with animations */}
        <div className="text-center mb-10">
          {/* Eyebrow */}
          <p
            className={`font-body text-xs uppercase tracking-widest text-editorial-terra mb-6 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            Rete di associazioni ludiche
          </p>

          {/* Main title */}
          <h1
            className={`font-elegant text-4xl sm:text-5xl md:text-6xl lg:text-8xl text-editorial-text mb-4 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: '0.1s' }}
          >
            Gioco In Loco
          </h1>

          {/* Subtitle */}
          <p
            className={`font-elegant text-lg sm:text-xl md:text-2xl lg:text-3xl text-editorial-text-secondary mb-6 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: '0.2s' }}
          >
            La comunità del gioco in Campania
          </p>

          {/* Associations */}
          <div
            className={`mb-10 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: '0.25s' }}
          >
            <div className="text-center mb-8">
              <p className="font-body text-xs uppercase tracking-widest text-editorial-text-muted mb-3">
                Le nostre realtà ludiche
              </p>
              <div className="w-16 h-px bg-editorial-terra/30 mx-auto" />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-5">
              {associations.map((assoc, index) => (
                <div
                  key={assoc.id}
                  className="w-14 h-14 bg-white border border-editorial-border rounded-editorial shadow-editorial-sm p-1.5 hover:shadow-editorial-md hover:scale-110 transition-all duration-300 stagger-fade-in cursor-pointer group"
                  title={assoc.name}
                  style={{ animationDelay: `${0.3 + index * 0.05}s` }}
                >
                  {assoc.logo ? (
                    <img
                      src={assoc.logo}
                      alt={assoc.name}
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full rounded-editorial bg-editorial-terra/10 flex items-center justify-center font-elegant text-editorial-terra text-lg group-hover:bg-editorial-terra/20 transition-colors">
                      {assoc.name.charAt(0)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Featured image placeholder */}
          <div
            className={`mb-12 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: '0.35s' }}
          >
            <div className="relative rounded-xl overflow-hidden border-2 border-editorial-border shadow-soft-md">
              {/* Placeholder: featured-community.jpg */}
              <div className="aspect-[21/9] bg-gradient-to-br from-editorial-terra/10 via-editorial-forest/10 to-editorial-gold/10 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4 float-energized">🎲</div>
                  <p className="font-elegant text-2xl text-editorial-text-muted/50">featured-community.jpg</p>
                  <p className="font-body text-sm text-editorial-text-muted/40 mt-1">21:9 ratio • ~1920×820px</p>
                  <p className="font-body text-xs text-editorial-text-muted/30 mt-2 max-w-md mx-auto">Photo of gaming community at event or meetup</p>
                </div>
              </div>
              {/* Caption bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-editorial-navy/90 to-transparent py-4 px-6">
                <p className="font-body text-sm text-white/80">La nostra comunità ludica durante gli eventi</p>
              </div>
            </div>
          </div>
        </div>

        {/* Activities section - What we do */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <p className="font-body text-xs uppercase tracking-widest text-editorial-terra mb-3">
              Cosa facciamo
            </p>
            <h2 className="font-elegant text-4xl md:text-5xl text-editorial-text mb-4">
              Le nostre attività
            </h2>
            <div className="w-12 h-px bg-editorial-terra/30 mx-auto" />
          </div>

          {/* Activity cards - Editorial magazine layout with enhanced animations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8 items-stretch">

            {/* Ludoteca - Board Games */}
            <div
              className={`animate-editorial-slide h-full transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
              style={{ animationDelay: '0.1s' }}
            >
              <div className="group relative bg-white border border-editorial-border rounded-editorial-lg shadow-soft-md overflow-hidden transition-all duration-500 hover:shadow-soft-lg hover:-translate-y-2 h-full flex flex-col cursor-pointer">

                {/* Header - Game board aesthetic */}
                <div className="relative h-44 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-b border-editorial-border overflow-hidden flex-shrink-0">
                  {/* Grid pattern overlay */}
                  <div className="absolute inset-0 opacity-15">
                    <svg className="w-full h-full" viewBox="0 0 80 80" preserveAspectRatio="none">
                      <defs>
                        <pattern id="gamegrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                          <rect x="1" y="1" width="18" height="18" fill="none" stroke="#C45D3A" strokeWidth="0.75"/>
                        </pattern>
                      </defs>
                      <rect width="100" height="100" fill="url(#gamegrid)"/>
                    </svg>
                  </div>

                  {/* Placeholder: ludoteca-hero.jpg - Board game table with pieces */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🎲</div>
                      <p className="font-body text-xs text-editorial-text-muted/60">ludoteca-hero.jpg</p>
                    </div>
                  </div>

                  {/* Decorative game pieces with float animation */}
                  <div className="absolute top-6 left-6 w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-lg flex items-center justify-center text-white font-display text-lg transform rotate-12 group-hover:rotate-24 transition-transform duration-500 float-bounce">
                    <span>6</span>
                  </div>
                  <div className="absolute top-10 right-10 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg flex items-center justify-center text-white font-display text-sm transform -rotate-6 group-hover:rotate-12 transition-transform duration-500 float-bounce" style={{ animationDelay: '0.2s' }}>
                    <span>3</span>
                  </div>
                  <div className="absolute bottom-8 left-12 w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-lg flex items-center justify-center text-white font-display text-sm transform rotate-45 group-hover:-rotate-12 transition-transform duration-500 float-bounce" style={{ animationDelay: '0.4s' }}>
                    <span>5</span>
                  </div>
                  <div className="absolute bottom-6 right-14 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg flex items-center justify-center text-yellow-900 font-display text-xs transform -rotate-12 group-hover:rotate-24 transition-transform duration-500 float-bounce" style={{ animationDelay: '0.6s' }}>
                    <span>2</span>
                  </div>

                  {/* Center icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/95 backdrop-blur-sm shadow-soft-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                      <svg className="w-8 h-8 text-editorial-terra" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round"/>
                        <rect x="14" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round"/>
                        <rect x="3" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round"/>
                        <rect x="14" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 flex flex-col flex-grow">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-1 h-6 bg-editorial-terra rounded-full"></span>
                    <h3 className="font-elegant text-2xl text-editorial-text">Ludoteca</h3>
                  </div>
                  <p className="font-body text-editorial-text-secondary leading-relaxed flex-grow">
                    Centinaia di titoli per partite rapide o serate lunghe. Dalla strategia al party game, dal cooperative al competitivo: il tavolo perfetto ti aspetta.
                  </p>
                </div>
              </div>
            </div>

            {/* Area GDR - Role-Playing Games */}
            <div
              className={`animate-editorial-slide h-full transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
              style={{ animationDelay: '0.2s' }}
            >
              <div className="group relative bg-white border border-editorial-border rounded-editorial-lg shadow-soft-md overflow-hidden transition-all duration-500 hover:shadow-soft-lg hover:-translate-y-2 h-full flex flex-col cursor-pointer">

                {/* Header - Parchment/scroll aesthetic */}
                <div className="relative h-44 bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-50 border-b border-editorial-border overflow-hidden flex-shrink-0">
                  {/* Cross-hatch texture */}
                  <div className="absolute inset-0 opacity-8">
                    <svg className="w-full h-full" viewBox="0 0 60 60" preserveAspectRatio="none">
                      <defs>
                        <pattern id="parchmenthatch" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                          <line x1="0" y1="0" x2="8" y2="8" stroke="#8B6914" strokeWidth="0.4"/>
                          <line x1="8" y1="0" x2="0" y2="8" stroke="#8B6914" strokeWidth="0.4"/>
                        </pattern>
                      </defs>
                      <rect width="100" height="100" fill="url(#parchmenthatch)"/>
                    </svg>
                  </div>

                  {/* Placeholder: gdr-hero.jpg - RPG table with dice and miniatures */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-2">⚔️</div>
                      <p className="font-body text-xs text-editorial-text-muted/60">gdr-hero.jpg</p>
                    </div>
                  </div>

                  {/* Decorative RPG elements with animations */}
                  <div className="absolute top-5 left-8 text-3xl transform rotate-12 group-hover:rotate-24 transition-transform duration-500 float-bounce">⚔️</div>
                  <div className="absolute top-8 right-10 text-2xl transform -rotate-6 group-hover:rotate-12 transition-transform duration-500 float-bounce" style={{ animationDelay: '0.3s' }}>🛡️</div>
                  <div className="absolute bottom-7 left-16 text-2xl transform -rotate-12 group-hover:-rotate-24 transition-transform duration-500 float-bounce" style={{ animationDelay: '0.5s' }}>🗡️</div>
                  <div className="absolute bottom-5 right-12 text-xl transform rotate-6 group-hover:rotate-24 transition-transform duration-500 float-bounce" style={{ animationDelay: '0.7s' }}>✨</div>

                  {/* D20 center icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-16 h-16 rounded-2xl bg-white/95 backdrop-blur-sm shadow-soft-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                      <span className="font-elegant text-2xl text-editorial-forest font-bold tracking-tight">D20</span>
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-editorial-gold text-white text-xs flex items-center justify-center font-bold shadow-sm heartbeat">
                        ?
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 flex flex-col flex-grow">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-1 h-6 bg-editorial-forest rounded-full"></span>
                    <h3 className="font-elegant text-2xl text-editorial-text">Area GDR</h3>
                  </div>
                  <p className="font-body text-editorial-text-secondary leading-relaxed flex-grow">
                    Avventure, one-shot, campagne: entra in mondi fantastici guidato da narratori esperti. Nessuna esperienza richiesta, solo curiosità.
                  </p>
                </div>
              </div>
            </div>

            {/* Eventi - Events Organizer */}
            <div
              className={`animate-editorial-slide h-full transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
              style={{ animationDelay: '0.3s' }}
            >
              <div className="group relative bg-white border border-editorial-border rounded-editorial-lg shadow-soft-md overflow-hidden transition-all duration-500 hover:shadow-soft-lg hover:-translate-y-2 h-full flex flex-col cursor-pointer">

                {/* Header - Event/banner aesthetic */}
                <div className="relative h-44 bg-gradient-to-br from-editorial-terra via-orange-600 to-red-500 border-b border-editorial-border overflow-hidden flex-shrink-0">
                  {/* Ribbon decoration */}
                  <div className="absolute top-0 left-0 right-0 h-4 flex">
                    <div className="flex-1 bg-gradient-to-r from-editorial-gold via-yellow-400 to-editorial-gold"></div>
                    <div className="w-8 bg-editorial-gold/80"></div>
                    <div className="flex-1 bg-gradient-to-r from-editorial-gold via-yellow-400 to-editorial-gold"></div>
                  </div>

                  {/* Spotlight effect */}
                  <div className="absolute inset-0">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-48 bg-white/10 blur-3xl rounded-full"></div>
                  </div>

                  {/* Placeholder: eventi-hero.jpg - Event crowd/convention photo */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🎪</div>
                      <p className="font-body text-xs text-white/60">eventi-hero.jpg</p>
                    </div>
                  </div>

                  {/* Decorative elements with animations */}
                  <div className="absolute top-8 left-6 w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center transform rotate-12 group-hover:rotate-24 transition-transform duration-500 float-bounce">
                    <span className="text-2xl">🎪</span>
                  </div>
                  <div className="absolute top-12 right-8 w-8 h-8 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center transform -rotate-6 group-hover:rotate-12 transition-transform duration-500 float-bounce" style={{ animationDelay: '0.2s' }}>
                    <span className="text-xl">🎫</span>
                  </div>

                  {/* Calendar icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/95 backdrop-blur-sm shadow-soft-lg flex flex-col items-center justify-center group-hover:scale-110 transition-transform duration-500">
                      <svg className="w-7 h-7 text-editorial-terra mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="font-elegant text-sm text-editorial-terra font-bold tracking-tight">2026</span>
                    </div>
                  </div>

                  {/* Location pin */}
                  <div className="absolute bottom-4 right-4 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center float-bounce" style={{ animationDelay: '0.4s' }}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 flex flex-col flex-grow">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-1 h-6 bg-editorial-gold rounded-full"></span>
                    <h3 className="font-elegant text-2xl text-editorial-text">Eventi</h3>
                  </div>
                  <p className="font-body text-editorial-text-secondary leading-relaxed flex-grow">
                    Organizzatori di eventi ludici autonomi e presenti nei più importanti appuntamenti fieristici. Dal Comicon alle iniziative sul territorio.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom tagline with gradient animation */}
          <div className="text-center mt-12 p-8 bg-gradient-to-r from-transparent via-editorial-border/50 to-transparent">
            <p className="font-elegant text-xl md:text-2xl text-editorial-text-secondary italic">
              "Giocare insieme è il cuore di tutto"
            </p>
          </div>
        </div>

      </div>
    </section>
  )
}