'use client'

import { useState, useEffect, useRef } from 'react'
import Hero from '../sections/Hero'
import ItalianGameJam from '../sections/ItalianGameJam'

// Recap section for each area
function AreaRecapSection({ id, title, emoji, description, stats, imagePlaceholder, imageAlt, reverse = false }) {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.2 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section
      id={id}
      ref={sectionRef}
      className={`relative py-20 px-6 comic-paper overflow-hidden ${reverse ? 'bg-comic-cream' : ''}`}
    >
      {/* Background decorations */}
      <div className="absolute inset-0 pattern-drift opacity-30" />

      <div className="relative max-w-6xl mx-auto">
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center ${reverse ? 'lg:flex-row-reverse' : ''}`}>
          {/* Content side */}
          <div
            className={`space-y-6 ${reverse ? 'lg:order-2' : 'lg:order-1'} transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            {/* Emoji and title */}
            <div className="flex items-center gap-4">
              <span className="text-5xl float-bounce">{emoji}</span>
              <h2 className="font-bangers text-4xl md:text-5xl text-comic-navy tracking-wider">{title}</h2>
            </div>

            {/* Description */}
            <div className="bg-white border-4 border-comic-navy rounded-xl p-6 shadow-[4px_4px_0px_0px_#1A1A2E]">
              <p className="font-comic text-comic-navy text-lg leading-relaxed">{description}</p>
            </div>

            {/* Stats pills */}
            {stats && (
              <div className="flex flex-wrap gap-3">
                {stats.map((stat) => (
                  <div
                    key={stat.text}
                    className="bg-comic-cyan/90 backdrop-blur-sm border-3 border-comic-navy rounded-full px-5 py-3 shadow-[3px_3px_0px_0px_#1A1A2E] hover:scale-105 transition-transform"
                  >
                    <span className="font-bangers text-comic-navy text-lg">{stat.icon} {stat.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Image side */}
          <div
            className={`${reverse ? 'lg:order-1' : 'lg:order-2'} transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: '0.2s' }}
          >
            <div className="relative rounded-xl overflow-hidden border-4 border-comic-navy shadow-[6px_6px_0px_0px_#1A1A2E]">
              {/* Image placeholder */}
              <div className="aspect-[4/3] bg-gradient-to-br from-comic-cyan/20 via-comic-magenta/20 to-comic-yellow/20 flex items-center justify-center">
                <div className="text-center p-6">
                  <div className="text-6xl mb-4 float-bounce">{emoji}</div>
                  <p className="font-bangers text-xl text-comic-navy tracking-wider">{imagePlaceholder}</p>
                  <p className="font-comic text-sm text-comic-navy/60 mt-2">{imageAlt}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Stats recap section at the end
function StatsRecap() {
  const stats = [
    { icon: '🎲', value: '100+', label: 'Giochi nella Ludoteca' },
    { icon: '⚔️', value: '100+', label: 'Sessioni GDR' },
    { icon: '🧩', value: '9', label: 'Realtà Ludiche' },
    { icon: '📅', value: '4', label: 'Giorni di evento' },
  ]

  return (
    <section className="relative py-20 px-6 comic-paper overflow-hidden">
      <div className="absolute inset-0 pattern-drift opacity-30" />

      <div className="relative max-w-5xl mx-auto text-center">
        <h2 className="font-bangers text-4xl md:text-5xl text-comic-navy tracking-wider mb-8">
          I NUMERI DEL COMICON 2026
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="bg-white border-4 border-comic-navy rounded-xl p-6 shadow-[4px_4px_0px_0px_#1A1A2E] hover:scale-105 transition-transform stagger-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="text-5xl mb-2">{stat.icon}</div>
              <div className="font-bangers text-4xl text-comic-magenta">{stat.value}</div>
              <div className="font-comic text-comic-navy/80 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Photo gallery teaser
function PhotoGalleryTeaser() {
  return (
    <section className="relative py-16 px-6 bg-comic-navy overflow-hidden">
      <div className="relative max-w-6xl mx-auto text-center">
        <div className="text-6xl mb-4">📸</div>
        <h2 className="font-bangers text-4xl text-comic-cream tracking-wider mb-4">
          LE FOTO DELL'EVENTO
        </h2>
        <p className="font-comic text-comic-cream/80 text-lg mb-6">
          A breve saranno disponibili le foto del COMICON 2026.
          <br />Seguiteci su Instagram per gli aggiornamenti!
        </p>
        <a
          href="#"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-comic-magenta to-pink-500 border-4 border-comic-cream rounded-full px-8 py-4 shadow-[4px_4px_0px_0px_#FFD93D] hover:scale-105 transition-transform"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          <span className="font-bangers text-xl text-white">@gioco.in.loco</span>
        </a>
      </div>
    </section>
  )
}

// Thanks section
function ThanksSection() {
  return (
    <section className="relative py-16 px-6 bg-comic-cream overflow-hidden">
      <div className="absolute inset-0 pattern-drift opacity-20" />

      <div className="relative max-w-4xl mx-auto text-center">
        <h2 className="font-bangers text-4xl md:text-5xl text-comic-navy tracking-wider mb-6">
          GRAZIE A TUTTI!
        </h2>
        <div className="bg-comic-yellow border-4 border-comic-navy rounded-xl p-8 shadow-[4px_4px_0px_0px_#1A1A2E]">
          <p className="font-comic text-comic-navy text-xl leading-relaxed">
            Il COMICON 2026 è stato un successo grazie a voi: giocatori, narratori, volontari e pubblico.
            <br /><br />
            <b>Alla prossima edizione!</b>
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <span className="text-4xl float-bounce">🎲</span>
            <span className="text-4xl float-bounce" style={{ animationDelay: '0.3s' }}>⚔️</span>
            <span className="text-4xl float-bounce" style={{ animationDelay: '0.6s' }}>🎮</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Comicon2026({ associations = [] }) {
  return (
    <>
      <Hero />
      <AreaRecapSection
        id="ludoteca"
        title="LUDOTECA"
        emoji="🎲"
        description="4 giorni di gioco libero con oltre 100 titoli tra strategia, party game e coop. Dal classico al nuovo, per esperti e principianti. La Ludoteca ha accolto centinaia di giocatori ogni giorno!"
        stats={[
          { icon: '🎲', text: '100+ GIOCHI' },
          { icon: '⏰', text: '10-19 TUTTI I GIORNI' },
          { icon: '🎟️', text: 'INGRESSO LIBERO' }
        ]}
        imagePlaceholder="ludoteca-comicon-2026.jpg"
        imageAlt="Photo of the Ludoteca area at COMICON 2026"
      />
      <AreaRecapSection
        id="area-gdr"
        title="AREA GDR"
        emoji="⚔️"
        description="Avventure, one-shot per tutti i gusti. Con oltre 100 sessioni guidate dai migliori narratori campani, l'Area GDR ha fatto vivere momenti indimenticabili."
        stats={[
          { icon: '⚔️', text: '100+ SESSIONI' },
          { icon: '🎭', text: '20+ MASTERS' },
          { icon: '🗺️', text: 'DIVERSI SISTEMI' }
        ]}
        imagePlaceholder="gdr-comicon-2026.jpg"
        imageAlt="Photo of the GDR area at COMICON 2026"
        reverse
      />
      <AreaRecapSection
        id="area-hardcore"
        title="HARDCORE & COOPERATIVE"
        emoji="🔥"
        description="Per chi ama le sfide vere: giochi complessi, cooperative e competitive per team affiatati. L'area hardcore ha messo alla prova i giocatori più determinati!"
        stats={[
          { icon: '🔥', text: 'COMPLESSITÀ ALTA' },
          { icon: '🤝', text: 'GIOCHI COOPERATIVI' },
          { icon: '🧠', text: 'STRATEGIA AVANZATA' }
        ]}
        imagePlaceholder="hardcore-comicon-2026.jpg"
        imageAlt="Photo of the HardCore area at COMICON 2026"
      />
      <AreaRecapSection
        id="area-young"
        title="AREA YOUNG"
        emoji="🦄"
        description="Lo spazio per i più giovani: giochi dedicati, miniatures painting e tanto divertimento. Curata da HobbyVille e Fantasy Fiber!"
        stats={[
          { icon: '🎨', text: 'LABORATORIO MINIATURE' },
          { icon: '🪑', text: '6 TAVOLI ATTIVI' },
          { icon: '👦', text: 'ETÀ 8-13 ANNI' }
        ]}
        imagePlaceholder="young-comicon-2026.jpg"
        imageAlt="Photo of the Young area at COMICON 2026"
        reverse
      />
      <ItalianGameJam associations={associations} />
      <StatsRecap />
      <PhotoGalleryTeaser />
      <ThanksSection />
    </>
  )
}