'use client'

import { useState, useRef, useEffect } from 'react'
import { Link } from '../../lib/router'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import hardcore from '../../data/hardcore.json'

function AssociationTextLink({ associationId, associations = [] }) {
  const association = associations.find((item) => item.key === associationId)

  if (!association) {
    return null
  }

  return (
    <Link
      href={`/associazione/${association.slug || association.id}`}
      className="underline decoration-2 underline-offset-4 hover:text-comic-magenta transition-colors"
    >
      {association.name}
    </Link>
  )
}

const complexityConfig = {
  'media': {
    bg: 'bg-sky-500',
    text: 'text-comic-navy',
    label: 'MEDIA',
    emoji: '⭐',
    barColor: 'from-sky-400 to-sky-500',
    glowColor: 'shadow-sky-500/50'
  },
  'alta': {
    bg: 'bg-orange-500',
    text: 'text-comic-navy',
    label: 'ALTA',
    emoji: '🔥',
    barColor: 'from-orange-500 to-red-500',
    glowColor: 'shadow-orange-500/50'
  },
  'molto alta': {
    bg: 'bg-red-500',
    text: 'text-white',
    label: 'MOLTO ALTA',
    emoji: '💥',
    barColor: 'from-red-600 to-red-800',
    glowColor: 'shadow-red-500/50'
  },
}

function ComplexityBar({ complexity }) {
  const config = complexityConfig[complexity]
  if (!config) return null

  const levels = { 'media': 1, 'alta': 2, 'molto alta': 3 }
  const level = levels[complexity] || 1

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`h-3 rounded-full transition-all duration-300 ${
            i <= level
              ? `bg-gradient-to-r ${config.barColor} ${config.glowColor}`
              : 'bg-comic-navy/20'
          }`}
          style={{
            width: i <= level ? '24px' : '12px',
            animationDelay: i <= level ? `${i * 0.2}s` : '0s'
          }}
        />
      ))}
      <span className={`ml-2 font-bangers text-xs ${config.text}`}>{config.label}</span>
    </div>
  )
}

function GameCard({ game, index, onClick, associations }) {
  const [isHovered, setIsHovered] = useState(false)
  const config = complexityConfig[game.complexity]

  return (
    <div
      className="w-48 flex-shrink-0 cursor-pointer group"
      style={{ animationDelay: `${index * 50}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div
        className={`relative h-full transition-all duration-300 ease-out ${
          isHovered ? 'scale-105' : ''
        }`}
        style={{
          transform: isHovered ? 'scale(1.05)' : 'scale(1)',
          filter: isHovered ? 'drop-shadow(0 10px 30px rgba(255, 100, 50, 0.4))' : 'none'
        }}
      >
        <Card className="overflow-hidden h-full transition-all duration-300">
          {/* Header with gradient based on complexity */}
          <div className={`relative h-32 bg-gradient-to-br from-comic-navy to-comic-dark border-b-3 border-comic-navy overflow-hidden ${
            config ? `shadow-[0_0_20px_rgba(255,100,50,0.3)]` : ''
          }`}>
            {/* Complexity glow effect */}
            {config && (
              <div
                className={`absolute inset-0 bg-gradient-to-t ${config.barColor} opacity-20 transition-opacity duration-300 ${isHovered ? 'opacity-40' : ''}`}
              />
            )}

            {game.image ? (
              <img
                src={game.image}
                alt={game.title}
                className={`w-full h-full object-cover transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`}
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.parentElement.classList.add('flex', 'items-center', 'justify-center')
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-5xl opacity-80">🎮</span>
              </div>
            )}

            {/* Complexity badge with glow */}
            <div className="absolute top-2 right-2">
              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-bangers text-sm border-2 border-comic-navy shadow-[2px_2px 0px 0px #1A1A2E] ${config?.bg || 'bg-gray-500'} ${config?.text || 'text-white'} ${
                game.complexity === 'molto alta' ? 'animate-pulse' : ''
              }`}
              style={{
                boxShadow: config ? `0 0 15px ${config.glowColor.replace('shadow-', 'rgba(').replace('/50)', ',0.5)')}` : 'none'
              }}
            >
              {config?.emoji}
            </span>
            </div>

            {/* Fire effect for alta/molto alta */}
            {game.complexity === 'alta' && (
              <div className="absolute bottom-0 left-0 right-0 h-8 flex items-end justify-center opacity-60">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-4 bg-gradient-to-t from-orange-500 to-yellow-400 rounded-full mx-0.5"
                    style={{
                      animation: `float-bounce 0.5s ease-in-out infinite`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  />
                ))}
              </div>
            )}

            {game.complexity === 'molto alta' && (
              <div className="absolute bottom-0 left-0 right-0 h-10 flex items-end justify-center">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className="w-3 h-6 bg-gradient-to-t from-red-600 to-orange-400 rounded-full mx-1 animate-pulse"
                    style={{
                      animation: `float-bounce 0.4s ease-in-out infinite`,
                      animationDelay: `${i * 0.08}s`
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Card body */}
          <div className="p-3 bg-white relative">
            {/* Energy bar */}
            <div className="mb-2">
              <ComplexityBar complexity={game.complexity} />
            </div>

            <Badge category={game.category}>{game.category}</Badge>
            <h3 className={`font-bangers text-sm text-comic-navy font-semibold mt-2 leading-tight line-clamp-1 transition-colors ${isHovered ? 'text-comic-magenta' : ''}`}>
              {game.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-comic-navy/70 mt-1">
              <span>👥 {game.players}</span>
              <span>⏱️ {game.time}</span>
            </div>

            {/* Reveal on hover */}
            <div className={`mt-2 pt-2 border-t-2 border-comic-navy/10 transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
              <span className="text-xs text-comic-orange font-bold flex items-center gap-1">
                MAGGIORI INFO →
              </span>
            </div>
          </div>
        </Card>

        {/* Hover glow border effect */}
        <div
          className={`absolute -inset-1 rounded-2xl pointer-events-none transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: `linear-gradient(135deg, ${config?.bg || '#888'}, #FF1493, #FFD93D)`,
            zIndex: -1,
            filter: 'blur(8px)'
          }}
        />
      </div>
    </div>
  )
}

export default function AreaHardCoreSection({ associations = [] }) {
  const [selectedGame, setSelectedGame] = useState(null)
  const [selectedComplexity, setSelectedComplexity] = useState(null)
  const [isVisible, setIsVisible] = useState(false)
  const scrollRef = useRef(null)
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

  const filteredGames = selectedComplexity
    ? hardcore.filter(g => g.complexity === selectedComplexity)
    : hardcore

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  return (
    <section id="area-hardcore" ref={sectionRef} className="relative py-24 px-6 pb-8 comic-paper overflow-hidden">
      {/* Dynamic background */}
      <div className="absolute inset-0 pattern-drift">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 10% 90%, rgba(255, 100, 50, 0.1) 0%, transparent 40%),
            radial-gradient(circle at 90% 10%, rgba(255, 20, 147, 0.1) 0%, transparent 40%)
          `
        }} />
      </div>

      {/* Fire decoration elements */}
      <div className="absolute top-20 left-20 w-0 h-0 border-l-[40px] border-r-[40px] border-b-[70px] border-l-transparent border-r-transparent border-b-orange-500/20" />
      <div className="absolute bottom-40 right-20 w-32 h-32 rounded-full bg-gradient-to-br from-red-500/10 to-orange-500/10" />

      <div className="relative max-w-7xl mx-auto">
        {/* Section header with animated fire */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-5xl float-bounce" style={{ filter: 'drop-shadow(0 4px 12px rgba(255,100,50,0.5))' }}>
              🔥
            </div>
            <h2
              className={`font-bangers text-5xl md:text-6xl text-comic-navy tracking-wider transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            >
              HARDCORE & COPERATIVE
            </h2>
            <div className="text-5xl float-bounce" style={{ filter: 'drop-shadow(0 4px 12px rgba(255,100,50,0.5))', animationDelay: '0.5s' }}>
              🔥
            </div>
          </div>

          {/* Info banner */}
          <div
            className={`inline-block bg-gradient-to-r from-comic-red to-red-700 border-4 border-comic-navy rounded-xl px-6 py-4 mb-6 shadow-[4px 4px 0px 0px #1A1A2E] transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: '0.2s' }}
          >
            <p className="font-comic text-white text-lg leading-relaxed">
              Ti senti pronto per una sfida vera?
              <br />
              Se cerchi un'esperienza di gioco profonda, dove la strategia e la collaborazione sono l'unica via per la vittoria, questa è la tua area.
              <br />
              Qui non si gioca solo per passare il tempo: si gioca per vincere insieme o cadere sotto i colpi del tabellone.
              <br />
              In quest'area troverai titoli complessi e avvincenti che metteranno alla prova le tue abilità tattiche. Affronta le emergenze più disparate, gestisci risorse scarse e coordina ogni mossa con il tuo team per sconfiggere il sistema di gioco.
              <br />
              Dimentica la fortuna: qui contano solo l'intuito e l'affiatamento!
              <br />
              Hai sempre voluto provare quel "cinghiale" di cui tutti parlano ma il manuale ti spaventa?
              <br />
              Non temere. Ad aiutarti nella selezione dei titoli e a spiegarne ogni dettaglio tecnico ci saranno i veterani di:
              <br />
              <span className="font-bold text-comic-yellow">
                <AssociationTextLink associationId="guiscardo" associations={associations} />, <AssociationTextLink associationId="pugno-dadi" associations={associations} /> ed <AssociationTextLink associationId="calderone" associations={associations} />.
              </span>
            </p>
          </div>

          {/* Complexity legend - clickable with visual feedback */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span className="font-comic text-sm text-comic-navy/60 uppercase tracking-wider">Complessità:</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedComplexity(null)}
                className={`flex items-center gap-2 border-2 border-comic-navy rounded-full px-4 py-1 shadow-[2px 2px 0px 0px #1A1A2E] transition-all btn-energetic ${
                  selectedComplexity === null
                    ? 'bg-comic-navy text-comic-yellow ring-4 ring-comic-yellow ring-offset-2'
                    : 'bg-comic-cream text-comic-navy hover:scale-105'
                }`}
              >
                <span className="font-bangers text-sm">TUTTI</span>
              </button>

              {Object.entries(complexityConfig).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setSelectedComplexity(key === selectedComplexity ? null : key)}
                  className={`flex items-center gap-2 ${val.bg} border-2 border-comic-navy rounded-full px-4 py-1 shadow-[2px 2px 0px 0px #1A1A2E] transition-all btn-energetic hover:scale-105 ${
                    selectedComplexity === key ? `ring-4 ring-offset-2 ring-comic-yellow scale-110` : ''
                  }`}
                >
                  <span className="text-lg">{val.emoji}</span>
                  <span className={`font-bangers text-sm ${val.text}`}>{val.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Games horizontal scroll with bounce arrows */}
        <div className="relative group">
          <button
            onClick={() => scroll('left')}
            className="hidden lg:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-14 h-14 bg-comic-cream border-4 border-comic-navy rounded-full items-center justify-center shadow-[4px 4px 0px 0px #1A1A2E] opacity-0 group-hover:opacity-100 transition-all hover:scale-110 nav-arrow"
          >
            <span className="font-bangers text-2xl text-comic-navy">←</span>
          </button>

          <button
            onClick={() => scroll('right')}
            className="hidden lg:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-14 h-14 bg-comic-cream border-4 border-comic-navy rounded-full items-center justify-center shadow-[4px 4px 0px 0px #1A1A2E] opacity-0 group-hover:opacity-100 transition-all hover:scale-110 nav-arrow"
          >
            <span className="font-bangers text-2xl text-comic-navy">→</span>
          </button>

          <div
            ref={scrollRef}
            className={`overflow-x-auto pb-4 scrollbar-hide transition-all duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            style={{ transitionDelay: '0.4s' }}
          >
            <div className="flex gap-4 px-6">
              {filteredGames.map((game, index) => (
                <div
                  key={game.id}
                  className={`stagger-fade-in ${isVisible ? 'visible' : ''}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <GameCard
                    game={game}
                    index={index}
                    onClick={() => setSelectedGame(game)}
                    associations={associations}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {filteredGames.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4 float-bounce">🎮</div>
            <p className="font-comic text-xl text-comic-navy/60">Nessun gioco con questa complessità.</p>
          </div>
        )}

        {/* Info note with warning style */}
        <div
          className={`mt-12 p-6 bg-gradient-to-r from-comic-orange/30 to-comic-red/20 border-4 border-comic-navy rounded-xl text-center transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          style={{ transitionDelay: '0.6s' }}
        >
          <p className="font-comic text-comic-navy text-lg">
            <span className="text-2xl mr-2">⚠️</span>
            I giochi hardcore e cooperativi richiedono tempo, coordinazione e dedizione. Consulta il nostro staff per sessioni di prova.
          </p>
        </div>
      </div>

      {selectedGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-comic-navy/70 backdrop-blur-sm"
            onClick={() => setSelectedGame(null)}
          />
          <div className="relative w-full max-w-lg bg-white border-4 border-comic-navy rounded-2xl shadow-[8px 8px 0px 0px #1A1A2E] overflow-hidden animate-pop">
            <div className="relative p-6 pb-4 bg-comic-cream border-b-4 border-comic-navy">
              <button
                onClick={() => setSelectedGame(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-comic-red text-white border-3 border-comic-navy rounded-lg flex items-center justify-center hover:scale-105 transition-transform shadow-[2px 2px 0px 0px #1A1A2E] btn-ripple"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="mb-3">
                <ComplexityBar complexity={selectedGame.complexity} />
              </div>

              <h3 className="font-bangers text-3xl text-comic-navy font-bold leading-tight pr-16">
                {selectedGame.title}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              {selectedGame.image && (
                <div className="w-full h-48 rounded-xl overflow-hidden border-3 border-comic-navy">
                  <img
                    src={selectedGame.image}
                    alt={selectedGame.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <p className="font-comic text-comic-navy leading-relaxed text-lg">
                {selectedGame.description}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-comic-cyan/20 border-3 border-comic-navy rounded-xl p-3">
                  <span className="font-comic text-xs text-comic-navy/60 uppercase">👥 Giocatori</span>
                  <p className="font-bangers text-xl text-comic-navy">{selectedGame.players}</p>
                </div>
                <div className="bg-comic-magenta/20 border-3 border-comic-navy rounded-xl p-3">
                  <span className="font-comic text-xs text-comic-navy/60 uppercase">⏱️ Durata</span>
                  <p className="font-bangers text-xl text-comic-navy">{selectedGame.time}</p>
                </div>
                <div className="bg-comic-yellow/20 border-3 border-comic-navy rounded-xl p-3">
                  <span className="font-comic text-xs text-comic-navy/60 uppercase">🎮 Categoria</span>
                  <p className="font-semibold text-comic-navy">{selectedGame.category}</p>
                </div>
                <div className="bg-comic-orange/20 border-3 border-comic-navy rounded-xl p-3">
                  <span className="font-comic text-xs text-comic-navy/60 uppercase">🏠 REALTÀ LUDICA</span>
                  <p className="font-semibold text-comic-navy">
                    <AssociationTextLink associationId={selectedGame.owner} associations={associations} />
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-comic-cream border-t-4 border-comic-navy">
              <button
                onClick={() => setSelectedGame(null)}
                className="w-full py-3 bg-comic-red text-white font-bangers text-xl border-3 border-comic-navy rounded-xl shadow-[3px 3px 0px 0px #1A1A2E] hover:translate-y-0.5 hover:shadow-[2px 2px 0px 0px #1A1A2E] transition-all btn-energetic"
              >
                CHIUDI
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}