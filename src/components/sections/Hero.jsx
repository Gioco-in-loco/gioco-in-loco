'use client'

import { useEffect, useState } from 'react'

export default function Hero() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      id="hero"
      className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-8 pb-8"
    >
      {/* Placeholder Hero Background Image */}
      <div className="absolute inset-0 z-0">
        {/* Hero image placeholder - replace with actual event image */}
        <div className="absolute inset-0 bg-gradient-to-br from-comic-navy via-comic-navy to-comic-navy/90" />

        {/* Placeholder: hero-comicon.jpg - Replace with panoramic photo of gaming event */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full h-full">
            {/* Placeholder indicator - DELETE when real image added */}
            <div className="absolute inset-0 bg-gradient-to-br from-comic-magenta/20 via-comic-cyan/10 to-comic-yellow/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center bg-comic-navy/80 backdrop-blur-sm border-4 border-dashed border-comic-cyan/50 rounded-2xl px-8 py-6">
                <div className="text-5xl mb-3">📸</div>
                <p className="font-bangers text-xl text-comic-cyan tracking-wider">HERO IMAGE PLACEHOLDER</p>
                <p className="font-comic text-sm text-comic-cream/70 mt-1">hero-comicon.jpg • 1920×1080</p>
                <p className="font-comic text-xs text-comic-cream/50 mt-2">Panoramic shot of gaming event crowd</p>
              </div>
            </div>
          </div>
        </div>

        {/* Abstract gaming pattern overlay */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `
            radial-gradient(circle at 20% 80%, rgba(255, 20, 147, 0.3) 0%, transparent 40%),
            radial-gradient(circle at 80% 20%, rgba(0, 212, 255, 0.3) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(255, 217, 61, 0.2) 0%, transparent 60%)
          `
        }} />

        {/* Animated grid pattern */}
        <div className="absolute inset-0 dice-pattern opacity-10 pattern-drift" />
      </div>

      {/* Noise texture overlay */}
      <div className="absolute inset-0 noise-texture z-[1]" />

      {/* Floating dice decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-[2]">
        {/* Dice 1 */}
        <div
          className="dice-deco float-bounce"
          style={{
            top: '15%',
            left: '8%',
            animationDelay: '0s',
            fontSize: '3rem',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
          }}
        >
          🎲
        </div>

        {/* Dice 2 */}
        <div
          className="dice-deco float-bounce"
          style={{
            top: '25%',
            right: '12%',
            animationDelay: '0.8s',
            fontSize: '2.5rem',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
          }}
        >
          🎲
        </div>

        {/* Card */}
        <div
          className="dice-deco float-bounce"
          style={{
            bottom: '30%',
            left: '5%',
            animationDelay: '1.2s',
            fontSize: '2.5rem',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
          }}
        >
          🃏
        </div>

        {/* D20 */}
        <div
          className="dice-deco float-bounce"
          style={{
            bottom: '20%',
            right: '8%',
            animationDelay: '0.4s',
            fontSize: '2.8rem',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
          }}
        >
          🎯
        </div>

        {/* Star burst decorations */}
        <div
          className="absolute starburst-animate"
          style={{
            top: '10%',
            right: '20%',
            width: '80px',
            height: '80px'
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full text-comic-yellow/40">
            <polygon points="50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35" />
          </svg>
        </div>

        <div
          className="absolute starburst-animate"
          style={{
            bottom: '15%',
            left: '15%',
            width: '60px',
            height: '60px'
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full text-comic-magenta/30">
            <polygon points="50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35" />
          </svg>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Pre-title badge */}
        <div
          className={`inline-block mb-6 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          style={{ transitionDelay: '0.1s' }}
        >
          <span className="bg-comic-magenta/90 backdrop-blur-sm border-4 border-comic-navy rounded-full px-6 py-2 shadow-[4px_4px_0px_0px_#1A1A2E]">
            <span className="font-bangers text-lg text-comic-navy tracking-wider">✦ NAPOLI 2026 ✦</span>
          </span>
        </div>

        {/* Comic burst behind title */}
        <div className="relative inline-block mb-6">
          {/* Dynamic burst effect */}
          <div
            className={`absolute -inset-12 bg-comic-yellow/40 rounded-full blur-3xl transition-all duration-1000 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
            style={{ transitionDelay: '0.3s' }}
          />
          <div
            className={`absolute -inset-8 bg-comic-magenta/30 rounded-full blur-2xl transition-all duration-1000 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
            style={{ transitionDelay: '0.4s' }}
          />
          <div
            className={`absolute -inset-4 bg-comic-cyan/20 rounded-full blur-xl transition-all duration-1000 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
            style={{ transitionDelay: '0.5s' }}
          />

          {/* Main title with comic style - animated entrance */}
          <div className="relative">
            <h1
              className={`font-bangers text-7xl md:text-9xl text-comic-cream tracking-wider mb-2 leading-none transition-all duration-700 pop-entrance ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
              style={{ transitionDelay: '0.4s', textShadow: '0 0 40px rgba(0, 212, 255, 0.5)' }}
            >
              COMICON
            </h1>
            <h1
              className={`font-bangers text-6xl md:text-8xl text-comic-cyan tracking-wider -mt-3 leading-none transition-all duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
              style={{
                transitionDelay: '0.6s',
                textShadow: '4px 4px 0 #1A1A2E, -2px -2px 0 #FF1493, 0 0 30px rgba(0, 212, 255, 0.5)'
              }}
            >
              2026
            </h1>
          </div>
        </div>

        {/* Subtitle banner */}
        <div
          className={`inline-block bg-comic-magenta border-4 border-comic-cream/30 rounded-xl px-8 py-3 mb-6 shadow-[6px_6px_0px_0px_#1A1A2E] transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          style={{ transitionDelay: '0.8s' }}
        >
          <p className="font-bangers text-2xl md:text-3xl text-comic-cream tracking-wide drop-shadow-lg">
            GIOCO IN LOCO
          </p>
        </div>

        {/* Tagline - speech bubble style */}
        <div
          className={`relative inline-block speech-bubble mb-8 max-w-2xl mx-auto transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          style={{ transitionDelay: '1s' }}
        >
          {/* Speech bubble glow */}
          <div className="absolute -inset-1 bg-comic-cyan/20 rounded-2xl blur-md -z-10" />

          <p className="font-comic text-lg md:text-xl text-comic-navy leading-relaxed relative z-10">
            <b className="text-comic-magenta">🎲 Quattro giorni di pura magia:
            <br />
            dove il tavolo diventa un mondo e i dadi decidono il destino! 🎲</b>
            <br />
            <br />
            Non è solo un evento, è un viaggio lungo cinque giorni tra strategie avvincenti, avventure GDR mozzafiato e sfide all'ultimo punto.
            <br />
            <span className="text-comic-cyan font-bold">Che tu sia un prode guerriero pronto a tutto o un fine stratega,</span> unisciti a noi per esplorare universi inesplorati e tessere storie leggendarie.
            <br />
            <span className="text-comic-yellow font-bold">Prendi posto, sfida i tuoi amici e lasciati sorprendere: il prossimo eroe potresti essere tu!</span>
          </p>
        </div>

        {/* Event details - comic badge style with glow */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          style={{ transitionDelay: '1.2s' }}
        >
          <div className="hero-badge-pulse bg-comic-cream/95 backdrop-blur-sm border-4 border-comic-navy rounded-xl px-6 py-3 shadow-[4px_4px_0px_0px_#1A1A2E] flex items-center gap-3 hover:scale-105 transition-transform">
            <span className="text-3xl">📅</span>
            <div className="text-left">
              <p className="font-bangers text-lg text-comic-navy">30 Aprile</p>
              <p className="font-bangers text-comic-magenta">3 Maggio 2026</p>
            </div>
          </div>
          <div className="hero-badge-pulse bg-comic-cream/95 backdrop-blur-sm border-4 border-comic-navy rounded-xl px-6 py-3 shadow-[4px_4px_0px_0px_#1A1A2E] flex items-center gap-3 hover:scale-105 transition-transform" style={{ animationDelay: '0.5s' }}>
            <span className="text-3xl">📍</span>
            <div className="text-left">
              <p className="font-bangers text-lg text-comic-navy">Mostra d'Oltremare</p>
              <p className="font-bangers text-comic-cyan">Napoli</p>
            </div>
          </div>
        </div>

        {/* CTA buttons - energetic style */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 flex-wrap transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          style={{ transitionDelay: '1.4s' }}
        >
          <button
            onClick={() => scrollTo('ludoteca')}
            className="btn-comic btn-energetic btn-primary px-10 py-4 text-xl relative overflow-hidden"
          >
            <span className="relative z-10">🎮 LUDOTECA</span>
          </button>
          <button
            onClick={() => scrollTo('area-gdr')}
            className="btn-comic btn-energetic btn-secondary px-10 py-4 text-xl relative overflow-hidden"
          >
            <span className="relative z-10">⚔️ AREA GDR</span>
          </button>
          <button
            onClick={() => scrollTo('area-hardcore')}
            className="btn-comic btn-energetic btn-orange px-10 py-4 text-xl relative overflow-hidden"
          >
            <span className="relative z-10">🔥 HARDCORE</span>
          </button>
          <button
            onClick={() => scrollTo('area-young')}
            className="btn-comic btn-energetic btn-secondary px-10 py-4 text-xl relative overflow-hidden"
          >
            <span className="relative z-10">🦄 YOUNG</span>
          </button>
        </div>

        {/* Stats row - comic pills with stagger animation */}
        <div
          className={`flex flex-wrap items-center justify-center gap-4 mt-12 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          style={{ transitionDelay: '1.6s' }}
        >
          <div className="stagger-fade-in bg-comic-cyan/90 backdrop-blur-sm border-3 border-comic-navy rounded-full px-5 py-2 shadow-[3px_3px_0px_0px_#1A1A2E] hover:scale-110 transition-transform cursor-pointer">
            <span className="font-bangers text-comic-navy text-lg">🎲 100+ GIOCHI</span>
          </div>
          <div className="stagger-fade-in bg-comic-magenta/90 backdrop-blur-sm border-3 border-comic-navy rounded-full px-5 py-2 shadow-[3px_3px_0px_0px_#1A1A2E] hover:scale-110 transition-transform cursor-pointer" style={{ animationDelay: '0.1s' }}>
            <span className="font-bangers text-comic-navy text-lg">⚔️ 100+ SESSIONI GDR</span>
          </div>
          <div className="stagger-fade-in bg-comic-yellow/90 backdrop-blur-sm border-3 border-comic-navy rounded-full px-5 py-2 shadow-[3px_3px_0px_0px_#1A1A2E] hover:scale-110 transition-transform cursor-pointer" style={{ animationDelay: '0.2s' }}>
            <span className="font-bangers text-comic-navy text-lg">🏆 9 REALTÀ LUDICHE</span>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-comic-paper to-transparent z-[3]" />
    </section>
  )
}