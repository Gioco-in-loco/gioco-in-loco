'use client'

import { useState, useEffect, useRef } from 'react'
import { Link } from '../../lib/router'

export default function ItalianGameJam({ associations = [] }) {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef(null)
  const magmaLudensAssociation = associations.find((association) => association.key === 'magma-ludens')

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
    <section id="italian-game-jam" ref={sectionRef} className="relative py-24 px-6 bg-comic-paper overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 pattern-drift">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 10% 90%, rgba(0, 212, 255, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 90% 10%, rgba(255, 20, 147, 0.08) 0%, transparent 40%)
          `
        }} />
      </div>

      {/* Decorative geometric shapes */}
      <div className="absolute top-20 right-20 w-32 h-32 rounded-full border-4 border-comic-cyan/20" />
      <div className="absolute bottom-30 left-20 w-0 h-0 border-l-[50px] border-r-[50px] border-b-[80px] border-l-transparent border-r-transparent border-b-comic-magenta/20" />
      <div className="absolute top-1/3 right-1/4 w-6 h-6 bg-comic-yellow/40 rounded-full" />

      <div className="relative max-w-6xl mx-auto">
        <div className="text-center mb-12">
          {/* Animated puzzle pieces */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <div
              className={`text-5xl float-bounce transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
              style={{ filter: 'drop-shadow(0 4px 8px rgba(0,212,255,0.3))' }}
            >
              🧩
            </div>
            <h2
              className={`font-bangers text-5xl md:text-6xl text-comic-navy tracking-wider transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            >
              ITALIAN GAME JAM
            </h2>
            <div
              className={`text-5xl float-bounce transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
              style={{ filter: 'drop-shadow(0 4px 8px rgba(255,20,147,0.3))', animationDelay: '0.5s' }}
            >
              🧩
            </div>
          </div>

          <div
            className={`inline-block bg-gradient-to-r from-comic-cyan to-cyan-400 border-4 border-comic-navy rounded-xl px-6 py-4 shadow-[4px 4px 0px 0px #1A1A2E] transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: '0.2s' }}
          >
            <p className="font-comic text-comic-navy text-lg leading-relaxed max-w-3xl">
              Uno spazio dedicato a <b>Italian Game Jam</b>, tra prototipi, idee in sviluppo e cultura del game design.
              <br />
              In questa area potrai esplorare i processi creativi e vedere come nasce un gioco prima di arrivare sul tavolo.
            </p>
          </div>
        </div>

        {/* Asymmetric grid layout */}
        <div
          className={`grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 items-stretch transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          style={{ transitionDelay: '0.4s' }}
        >
          {/* Left card - larger */}
          <div className="bg-white border-4 border-comic-navy rounded-2xl p-8 shadow-[6px_6px 0px 0px #1A1A2E] transition-all duration-300 hover:scale-[1.02] hover:shadow-[8px 8px 0px 0px #1A1A2E] hover:border-comic-cyan group">
            <div className="flex items-center gap-3 mb-4 group-hover:scale-105 transition-transform">
              <span className="text-3xl">🎮</span>
              <h3 className="font-bangers text-3xl text-comic-magenta">COSA TROVI QUI</h3>
            </div>

            <div className="space-y-4 font-comic text-comic-navy text-lg leading-relaxed">
              <p>
                Un punto d&apos;incontro per chi ama i giochi non solo da giocare, ma anche da immaginare, costruire e testare.
              </p>
              <p>
                L&apos;area mette al centro il dietro le quinte del game design italiano: prototipi, playtest e scambio di idee.
              </p>
              <p>
                In particolare troverai <b className="text-comic-cyan">Magma Ludens</b>, realtà impegnata nella promozione della cultura del progetto e dello sviluppo consapevole del gioco da tavolo.
              </p>
            </div>

            {/* Decorative element */}
            <div className="mt-6 flex items-center gap-2">
              <div className="w-12 h-1 bg-gradient-to-r from-comic-cyan to-comic-magenta rounded-full" />
              <div className="w-3 h-3 bg-comic-yellow rounded-full" />
              <div className="w-6 h-1 bg-gradient-to-r from-comic-magenta to-comic-cyan rounded-full" />
            </div>
          </div>

          {/* Right card - smaller with CTA */}
          <div className="bg-gradient-to-b from-comic-yellow to-comic-yellow/80 border-4 border-comic-navy rounded-2xl p-8 shadow-[6px 6px 0px 0px #1A1A2E] flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:shadow-[8px 8px 0px 0px #1A1A2E] hover:border-comic-magenta group">
            <div>
              <div className="flex items-center gap-3 mb-4 group-hover:scale-105 transition-transform">
                <span className="text-3xl">✨</span>
                <h3 className="font-bangers text-3xl text-comic-navy">IN EVIDENZA</h3>
              </div>

              <div className="space-y-3">
                <div className="bg-white border-3 border-comic-navy rounded-xl px-4 py-3 shadow-[3px 3px 0px 0px #1A1A2E] transition-all duration-200 hover:translate-x-1 hover:shadow-[4px 4px 0px 0px #1A1A2E]">
                  <p className="font-bangers text-comic-navy text-xl">Prototipi e playtest</p>
                </div>
                <div className="bg-white border-3 border-comic-navy rounded-xl px-4 py-3 shadow-[3px 3px 0px 0px #1A1A2E] transition-all duration-200 hover:translate-x-1 hover:shadow-[4px 4px 0px 0px #1A1A2E]">
                  <p className="font-bangers text-comic-navy text-xl">Focus sul game design</p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <Link
                href={magmaLudensAssociation ? `/associazione/${magmaLudensAssociation.slug || magmaLudensAssociation.id}` : '/chi-siamo'}
                className="btn-comic btn-energetic bg-comic-magenta text-comic-navy font-bangers text-2xl border-4 border-comic-navy rounded-xl px-6 py-4 shadow-[4px 4px 0px 0px #1A1A2E] hover:translate-y-1 hover:shadow-[6px 6px 0px 0px #1A1A2E] transition-all inline-flex items-center justify-center w-full text-center pulse-glow"
              >
                <span className="relative z-10">SCOPRI MAGMA LUDENS →</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom decorative bar */}
        <div
          className={`mt-12 flex items-center justify-center gap-4 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          style={{ transitionDelay: '0.6s' }}
        >
          <div className="h-1 w-24 bg-gradient-to-r from-transparent to-comic-cyan rounded-full" />
          <div className="w-4 h-4 bg-comic-magenta rounded-full rotate-45" />
          <div className="h-1 w-32 bg-gradient-to-r from-comic-magenta to-comic-yellow rounded-full" />
          <div className="w-4 h-4 bg-comic-yellow rounded-full rotate-45" />
          <div className="h-1 w-24 bg-gradient-to-r from-comic-yellow to-transparent rounded-full" />
        </div>
      </div>
    </section>
  )
}