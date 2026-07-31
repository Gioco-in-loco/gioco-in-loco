'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Card from '../ui/Card'

export default function ChiSiamoPage({ associations = [] }) {
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

  const cities = [...new Set(
    associations
      .map((association) => association.location?.city)
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right, 'it-IT'))

  return (
    <section id="chi-siamo" ref={sectionRef} className="relative py-20 px-6 energized-bg">
      {/* Dice pattern background */}
      <div className="absolute inset-0 dice-pattern-energized opacity-50 pointer-events-none pattern-drift" />

      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-20 h-20 rounded-full bg-editorial-terra/10" />
      <div className="absolute bottom-40 right-10 w-32 h-32 rounded-full bg-editorial-forest/10" />

      <div className="relative max-w-5xl mx-auto">

        {/* Header — Gioco In Loco, the collective behind every association below */}
        <div className="text-center mb-12">
          <p
            className={`font-body text-xs uppercase tracking-widest text-editorial-terra mb-6 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            Chi siamo
          </p>
          <img
            src="/loghi-ass/gioco-in-loco-512.png"
            alt="Gioco In Loco"
            className={`mx-auto h-40 w-auto transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: '0.1s' }}
          />
          <svg
            className={`mx-auto mt-6 h-8 w-8 text-editorial-terra transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0 animate-bounce' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: '0.25s' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>

        {/* Associations — the realities that make up the collective */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <p className="font-body text-xs uppercase tracking-widest text-editorial-text-muted mb-3">
              Le nostre realtà ludiche
            </p>
            <h2 className="font-elegant text-3xl text-editorial-text font-bold">Le associazioni</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {associations.map((assoc, index) => (
              <Link
                key={assoc.id}
                href={`/associazione/${assoc.slug || assoc.id}`}
                className={`transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${0.3 + index * 0.1}s` }}
              >
                <Card
                  variant="editorial"
                  className="h-full cursor-pointer group association-card"
                >
                  <div className="flex items-start gap-5">
                    {/* Logo */}
                    <div className={`w-20 h-20 rounded-xl border-2 border-editorial-border flex items-center justify-center flex-shrink-0 bg-white ${!assoc.logo ? 'bg-editorial-terra/10' : ''} group-hover:border-editorial-terra transition-colors`}>
                      {assoc.logo ? (
                        <img
                          src={assoc.logo}
                          alt={assoc.name}
                          className="w-full h-full object-contain p-1 group-hover:scale-110 transition-transform"
                        />
                      ) : (
                        <span className="font-elegant text-2xl text-editorial-terra font-bold">
                          {assoc.name.charAt(0)}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-grow min-w-0">
                      <h3 className="font-elegant text-xl text-editorial-text mb-2 group-hover:text-editorial-terra transition-colors font-bold">
                        {assoc.name}
                      </h3>
                      <p className="font-body text-sm text-editorial-text-muted leading-relaxed mb-3 line-clamp-2">
                        {assoc.bio.length > 120 ? assoc.bio.slice(0, 120) + '...' : assoc.bio}
                      </p>
                      <div className="flex items-center gap-2 text-editorial-terra font-body text-sm font-semibold group-hover:gap-3 transition-all">
                        <span>Scopri di più</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
          {associations.length === 0 && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4 float-energized">🎲</div>
              <p className="font-body text-editorial-text-secondary">Nessuna associazione disponibile al momento.</p>
            </div>
          )}
        </div>

        <div className="section-divider-energized w-24 mx-auto mb-16" />

        {/* Intro with animated reveal */}
        <div
          className={`max-w-3xl mx-auto text-center mb-12 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          <h2 className="font-elegant text-3xl md:text-4xl text-editorial-text mb-6 font-bold">
            La nostra storia
          </h2>
          <p className="font-body text-lg text-editorial-text-secondary leading-relaxed">
            <strong className="text-editorial-text font-semibold">Gioco in Loco</strong> è una rete di enti e gruppi di gioco in Campania (e oltre) che promuove il gioco libero e gratuito come atto culturale, sociale e di autoconsapevolezza. Nasce per giocare e far giocare, per diffondere tra giovani e meno giovani gli infiniti benefici del gioco da tavolo, di ruolo, del gamedesign e del multiforme mondo del gioco.
          </p>
        </div>

        {/* Group photo placeholder */}
        <div
          className={`max-w-4xl mx-auto mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          style={{ transitionDelay: '0.1s' }}
        >
          <div className="relative rounded-xl overflow-hidden border-2 border-editorial-border shadow-soft-md">
            {/* Placeholder: chi-siamo-group.jpg - Community group photo */}
            <div className="aspect-[16/7] bg-gradient-to-br from-editorial-terra/10 via-editorial-forest/10 to-editorial-gold/10 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-3 float-energized">👥</div>
                <p className="font-elegant text-xl text-editorial-text-muted/50">chi-siamo-group.jpg</p>
                <p className="font-body text-sm text-editorial-text-muted/40 mt-1">16:7 ratio • ~1600×700px</p>
                <p className="font-body text-xs text-editorial-text-muted/30 mt-2 max-w-sm mx-auto">Group photo of all associations at a gaming event</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mission section */}
        <div className="mb-20">
          <Card variant="editorial" className="max-w-3xl mx-auto energized-card">
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 rounded-full bg-editorial-terra/10 flex items-center justify-center flex-shrink-0 float-energized pulse-glow-energized">
                <svg className="w-6 h-6 text-editorial-terra" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h2 className="font-elegant text-xl text-editorial-text mb-3 font-bold">La nostra missione</h2>
                <p className="font-body text-editorial-text-secondary leading-relaxed">
                  Crediamo che il gioco sia un linguaggio universale che supera barriere di età, estrazione sociale e provenienza. Gioco in Loco crea momenti di aggregazione e divertimento sano durante i più importanti eventi ludici nelle città, ma anche e soprattutto in tutto l'anno nelle sedi di ciascun ente e ovunque ci sia una giocatrice o un giocatore che necessiti di aiuto nel trovare un momento e uno spazio di gioco.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Locations */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <p className="font-body text-xs uppercase tracking-widest text-editorial-text-muted mb-3">
              Dove trovarci
            </p>
            <div className="section-divider-energized w-16 mx-auto" />
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {cities.map((city, index) => (
              <div
                key={city}
                className="px-5 py-2.5 bg-white border-2 border-editorial-border rounded-full font-body text-sm text-editorial-text-secondary hover:border-editorial-terra hover:text-editorial-terra transition-all hover:scale-105 stagger-fade-energized"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {city}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
