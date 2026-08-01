'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Card from '../ui/Card'
import { PeopleIcon, MapPinIcon, ArrowRightIcon } from '../ui/Icons'

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
    <section id="chi-siamo" ref={sectionRef} className="relative py-20 px-6">
      <div className="absolute inset-0 dice-pattern opacity-20 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto">

        {/* Header — asymmetric two-column, same language as the Home hero */}
        <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 mb-20">
          <div
            className={`text-center lg:text-left transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            <p className="font-body text-xs uppercase tracking-widest text-editorial-terra mb-5">
              Chi siamo
            </p>
            <img
              src="/loghi-ass/gioco-in-loco-512.png"
              alt="Gioco In Loco"
              className="mx-auto lg:mx-0 h-28 w-auto mb-5"
            />
            <p className="mx-auto lg:mx-0 max-w-sm font-body text-[15px] leading-relaxed text-editorial-text-secondary">
              Una rete di enti e gruppi di gioco in Campania che promuove il gioco da tavolo, di ruolo e libero come atto culturale, sociale e di aggregazione.
            </p>
          </div>

          {/* Mission — tilted card, same treatment as the Home stat panel */}
          <div
            className={`relative transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ transitionDelay: '0.15s' }}
          >
            <div
              className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-editorial-terra/10 via-editorial-gold/10 to-editorial-forest/15 blur-2xl"
              aria-hidden="true"
            />
            <Card variant="editorial" className="relative rotate-1 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-start gap-5">
                <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-editorial-terra/10 text-editorial-terra">
                  <PeopleIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-elegant text-xl text-editorial-text mb-3 font-bold">La nostra missione</h2>
                  <p className="font-body text-editorial-text-secondary leading-relaxed">
                    Nasciamo per giocare e far giocare: diffondiamo tra giovani e meno giovani i benefici del gioco da tavolo, di ruolo e del gamedesign. Crediamo che il gioco sia un linguaggio universale, capace di superare barriere di età ed estrazione sociale — per questo creiamo momenti di incontro sia durante i grandi eventi fieristici, sia tutto l'anno nelle sedi di ciascun ente.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Associations */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <p className="font-body text-xs uppercase tracking-widest text-editorial-text-muted mb-3">
              {associations.length} associazion{associations.length === 1 ? 'e' : 'i'}{cities.length > 0 ? ` · ${cities.length} città` : ''}
            </p>
            <h2 className="font-elegant text-3xl text-editorial-text font-bold">Le associazioni</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {associations.map((assoc, index) => (
              <Link
                key={assoc.id}
                href={`/associazione/${assoc.slug || assoc.id}`}
                className={`transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                style={{ transitionDelay: `${Math.min(0.1 + index * 0.05, 0.4)}s` }}
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
                        <ArrowRightIcon className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
          {associations.length === 0 && (
            <div className="text-center py-12">
              <p className="font-body text-editorial-text-secondary">Nessuna associazione disponibile al momento.</p>
            </div>
          )}
        </div>

        {/* Locations */}
        {cities.length > 0 && (
          <div className="mb-14 text-center">
            <p className="font-body text-xs uppercase tracking-widest text-editorial-text-muted mb-4 flex items-center justify-center gap-2">
              <MapPinIcon className="h-4 w-4" />
              Dove trovarci
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {cities.map((city) => (
                <div
                  key={city}
                  className="px-5 py-2.5 bg-white border-2 border-editorial-border rounded-full font-body text-sm text-editorial-text-secondary hover:border-editorial-terra hover:text-editorial-terra transition-all"
                >
                  {city}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Closing CTA */}
        <div className="text-center border-t border-editorial-border/60 pt-10">
          <p className="font-elegant text-lg text-editorial-text-secondary mb-5">
            Vuoi conoscerci di persona? Ci trovi ai nostri eventi.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/dice-fest" className="btn-primary">
              Vai al Dice Fest
            </Link>
            <Link href="/contattaci" className="btn-ghost">
              Contattaci
            </Link>
          </div>
        </div>

      </div>
    </section>
  )
}
