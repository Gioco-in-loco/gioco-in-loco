'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Link } from '../../lib/router'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import giochi from '../../data/giochi.json'

// Dynamically extract unique categories from giochi.json
const uniqueCategories = [...new Set(giochi.map(g => g.category))].sort()
const staffAssociationIds = ['guiscardo', 'pugno-dadi', 'calderone', 'drago-verde-ischia', 'magma-ludens']

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


// Single-select dropdown for category
function CategoryDropdown({ categories, activeCategory, onChange }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-6 py-3 bg-comic-cream border-4 border-comic-navy rounded-xl font-bangers text-lg transition-all hover:scale-105 shadow-[3px_3px_0px_0px_#1A1A2E] btn-energetic"
      >
        <span>{activeCategory === 'tutti' ? 'TUTTI' : activeCategory.toUpperCase()}</span>
        <span className="ml-1">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-64 bg-white border-4 border-comic-navy rounded-xl shadow-[4px_4px_0px_0px_#1A1A2E] z-50 max-h-64 overflow-y-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  onChange(cat)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-comic-cream transition-colors ${
                  activeCategory === cat ? 'bg-comic-magenta/20' : ''
                }`}
              >
                <span className="font-comic text-sm text-comic-navy">
                  {cat === 'tutti' ? 'TUTTI' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function GameCard({ gioco, index, onClick }) {
  const [isHovered, setIsHovered] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setMousePos({ x, y })
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setMousePos({ x: 0, y: 0 })
  }

  return (
    <div
      className="w-36 sm:w-44 md:w-48 flex-shrink-0 cursor-pointer group"
      style={{
        animationDelay: `${index * 50}ms`
      }}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      <div
        className="relative h-full transition-all duration-300 ease-out"
        style={{
          transform: isHovered
            ? `perspective(1000px) rotateY(${mousePos.x * 10}deg) rotateX(${-mousePos.y * 10}deg) scale(1.08)`
            : 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1)',
          boxShadow: isHovered
            ? '0 20px 40px rgba(26, 26, 46, 0.3), 0 0 0 4px rgba(0, 212, 255, 0.3)'
            : '4px 4px 0px 0px #1A1A2E'
        }}
      >
        <Card className="overflow-hidden h-full flex flex-col bg-white">
          {/* Image container with glow */}
          <div className="relative h-28 sm:h-32 md:h-36 bg-gradient-to-br from-comic-cyan/30 to-comic-magenta/30 border-b-3 border-comic-navy overflow-hidden">
            {/* Glow effect on hover */}
            <div
              className={`absolute inset-0 bg-gradient-to-t from-comic-cyan/40 to-transparent opacity-0 transition-opacity duration-300 ${isHovered ? 'opacity-100' : ''}`}
            />

            <img
              src={gioco.image}
              alt={gioco.title}
              className="w-full h-full object-cover transition-transform duration-300"
              style={{
                transform: isHovered ? 'scale(1.1)' : 'scale(1)'
              }}
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.parentElement.classList.add('flex', 'items-center', 'justify-center')
              }}
            />
            <div className="absolute top-2 right-2">
              <Badge category={gioco.category}>{gioco.category}</Badge>
            </div>
            <div className="absolute bottom-2 left-2 bg-comic-yellow border-2 border-comic-navy rounded-lg px-2 py-1 shadow-[2px_2px_0px_0px_#1A1A2E]">
              <span className="font-bangers text-comic-navy text-xs">{gioco.players}</span>
            </div>

            {/* Shine effect on hover */}
            <div
              className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.4) 55%, transparent 60%)',
                transform: isHovered ? 'translateX(-100%)' : 'translateX(100%)'
              }}
            />
          </div>

          <div className="p-3 flex flex-col bg-white">
            <h3 className="font-bangers text-sm sm:text-base text-comic-navy font-semibold leading-tight line-clamp-1 group-hover:text-comic-magenta transition-colors">
              {gioco.title}
            </h3>
            <div className="flex items-center gap-1 text-xs text-comic-navy/70 mt-1">
              <span>⏱️</span>
              <span className="font-semibold">{gioco.time}</span>
            </div>
            <div className="mt-2 pt-2 border-t-2 border-comic-navy/10">
              <span className="text-xs text-comic-cyan font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                MAGGIORI INFO →
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function Modal({ gioco, onClose, associations }) {
  const owner = associations.find((item) => item.key === gioco.owner)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-comic-navy/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white border-4 border-comic-navy rounded-2xl shadow-[8px_8px_0px_0px_#1A1A2E] overflow-hidden animate-pop">
        <div className="relative p-6 pb-4 bg-comic-cream border-b-4 border-comic-navy">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-comic-red text-white border-3 border-comic-navy rounded-lg flex items-center justify-center hover:scale-105 transition-transform shadow-[2px_2px_0px_0px_#1A1A2E] btn-ripple"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h3 className="font-bangers text-3xl text-comic-navy font-bold leading-tight pr-16">
            {gioco.title}
          </h3>
        </div>
        <div className="p-6 space-y-4">
          {gioco.image && (
            <div className="w-full h-48 rounded-xl overflow-hidden border-3 border-comic-navy">
              <img src={gioco.image} alt={gioco.title} className="w-full h-full object-cover" />
            </div>
          )}
          {gioco.description && (
            <div className="bg-comic-cream border-3 border-comic-navy rounded-xl p-4">
              <p className="font-comic text-comic-navy leading-relaxed">{gioco.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-comic-cyan/20 border-3 border-comic-navy rounded-xl p-3">
              <span className="font-comic text-xs text-comic-navy/60 uppercase">👥 Giocatori</span>
              <p className="font-bangers text-xl text-comic-navy">{gioco.players}</p>
            </div>
            <div className="bg-comic-yellow/20 border-3 border-comic-navy rounded-xl p-3">
              <span className="font-comic text-xs text-comic-navy/60 uppercase">⏱️ Durata</span>
              <p className="font-bangers text-xl text-comic-navy">{gioco.time}</p>
            </div>
            <div className="bg-comic-magenta/20 border-3 border-comic-navy rounded-xl p-3">
              <span className="font-comic text-xs text-comic-navy/60 uppercase">🎮 Categoria</span>
              <p className="font-semibold text-comic-navy">{gioco.category}</p>
            </div>
            <div className="bg-comic-orange/20 border-3 border-comic-navy rounded-xl p-3">
              <span className="font-comic text-xs text-comic-navy/60 uppercase">🏠 REALTÀ LUDICA</span>
              <p className="font-semibold text-comic-navy">
                {owner ? <AssociationTextLink associationId={owner.id} associations={associations} /> : ''}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-comic-cream border-t-4 border-comic-navy">
          <button
            onClick={onClose}
            className="w-full py-3 bg-comic-magenta text-comic-navy font-bangers text-xl border-3 border-comic-navy rounded-xl shadow-[3px_3px_0px_0px_#1A1A2E] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#1A1A2E] transition-all btn-energetic"
          >
            CHIUDI
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Ludoteca({ associations = [] }) {
  const [activeCategory, setActiveCategory] = useState('tutti')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGame, setSelectedGame] = useState(null)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.2 }
    )

    if (scrollRef.current) {
      observer.observe(scrollRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const filteredGames = useMemo(() => {
    let games = activeCategory === 'tutti' ? giochi : giochi.filter(g => g.category === activeCategory)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      games = games.filter(g => g.title.toLowerCase().includes(query))
    }
    return games
  }, [activeCategory, searchQuery])

  return (
    <section id="ludoteca" className="relative py-24 px-6 pb-8 comic-paper overflow-hidden">
      {/* Dynamic background pattern */}
      <div className="absolute inset-0 pattern-drift">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 10% 20%, rgba(0, 212, 255, 0.1) 0%, transparent 30%),
            radial-gradient(circle at 90% 80%, rgba(255, 20, 147, 0.1) 0%, transparent 30%),
            radial-gradient(circle at 50% 50%, rgba(255, 217, 61, 0.05) 0%, transparent 50%)
          `
        }} />
      </div>

      {/* Geometric decorations */}
      <div className="absolute top-10 left-10 w-20 h-20 border-4 border-comic-cyan/20 rounded-full rotate-45" />
      <div className="absolute bottom-20 right-20 w-16 h-16 bg-comic-magenta/10 rounded-full" />
      <div className="absolute top-1/2 left-5 w-0 h-0 border-l-[30px] border-r-[30px] border-b-[50px] border-l-transparent border-r-transparent border-b-comic-yellow/20" />

      <div className="relative max-w-7xl mx-auto">
        {/* Section header with animated dice */}
        <div className="text-center mb-12">
          {/* Animated dice icon */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-5xl dice-roll" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}>
              🎲
            </div>
            <h2
              className={`font-bangers text-5xl md:text-6xl text-comic-navy tracking-wider transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            >
              LUDOTECA
            </h2>
            <div className="text-5xl dice-roll" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))', animationDelay: '0.5s' }}>
              🎲
            </div>
          </div>

          {/* Info banner */}
          <div
            className={`inline-block bg-comic-cream border-4 border-comic-navy rounded-xl px-6 py-4 mb-6 shadow-[4px_4px_0px_0px_#1A1A2E] transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: '0.2s' }}
          >
            <p className="font-comic text-comic-navy text-lg leading-relaxed">
              Voglia di una partita veloce? Qui il divertimento è istantaneo!
              <br />
              Vieni a sfidare i tuoi amici sui titoli più amati del momento o scopri quel gioco che ti ha sempre incuriosito ma non hai mai avuto l'occasione di provare. Zero stress, poche regole e tantissima voglia di stare insieme: che tu sia un esperto o un principiante, troverai pane per i tuoi denti!

              Ad aiutarti nella scelta e a spiegarti tutto in pochi minuti ci saranno i ragazzi di:
              <br />
              <b>
                {staffAssociationIds.map((associationId, index) => (
                  <span key={associationId}>
                    {index > 0 ? ', ' : ''}
                    <AssociationTextLink associationId={associationId} associations={associations} />
                  </span>
                ))}
              </b>
              <br />
              Ingresso libero, nessuna prenotazione necessaria! Vi aspettiamo numerosi al Padiglione 3!
            </p>
          </div>

          {/* Info pills with stagger animation */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: '⏰', text: '10:00 - 19:00', color: 'comic-cyan', delay: '0.3s' },
              { icon: '🎟️', text: 'INGRESSO LIBERO', color: 'comic-magenta', delay: '0.4s' },
              { icon: '🎮', text: '100+ GIOCHI', color: 'comic-yellow', delay: '0.5s' }
            ].map((pill, i) => (
              <div
                key={pill.text}
                className={`stagger-fade-in bg-${pill.color}/90 backdrop-blur-sm border-3 border-comic-navy rounded-full px-5 py-2 shadow-[3px_3px 0px 0px #1A1A2E] hover:scale-110 transition-transform cursor-pointer`}
                style={{ animationDelay: pill.delay }}
              >
                <span className="font-bangers text-comic-navy">{pill.icon} {pill.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Search bar - comic style with glow effect */}
        <div className="flex justify-center mb-8">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="Cerca un gioco..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className={`w-full px-6 py-4 pl-12 bg-white border-4 border-comic-navy rounded-xl font-comic text-lg text-comic-navy placeholder-comic-navy/40 shadow-[4px_4px_0px_0px_#1A1A2E] focus:outline-none transition-all duration-300 ${isSearchFocused ? 'ring-4 ring-comic-cyan/50 scale-[1.02]' : ''
                }`}
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">🔍</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-comic-navy text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform btn-ripple"
              >
                ×
              </button>
            )}

            {/* Search glow effect when focused */}
            {isSearchFocused && (
              <div className="absolute -inset-1 bg-comic-cyan/20 rounded-xl blur-lg -z-10" />
            )}
          </div>
        </div>

        {/* Category filter dropdown */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          <CategoryDropdown
            categories={['tutti', ...uniqueCategories]}
            activeCategory={activeCategory}
            onChange={setActiveCategory}
          />
        </div>

        {/* Results count */}
        <div className="text-center mb-6">
          <p className="font-comic text-comic-navy/70">
            {filteredGames.length} giochi trovati
            {searchQuery && <span> per "{searchQuery}"</span>}
          </p>
        </div>

        {/* Games horizontal scroll with bounce arrows */}
        <div className="relative group">
          {/* Left arrow - bounce animation */}
          <button
            onClick={() => scroll('left')}
            className="hidden lg:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-14 h-14 bg-comic-cream border-4 border-comic-navy rounded-full items-center justify-center shadow-[4px_4px 0px 0px #1A1A2E] opacity-0 group-hover:opacity-100 transition-all hover:scale-110 nav-arrow"
          >
            <span className="font-bangers text-2xl text-comic-navy">←</span>
          </button>

          {/* Right arrow - bounce animation */}
          <button
            onClick={() => scroll('right')}
            className="hidden lg:flex absolute right-20 top-1/2 -translate-y-1/2 z-10 w-14 h-14 bg-comic-cream border-4 border-comic-navy rounded-full items-center justify-center shadow-[4px 4px 0px 0px #1A1A2E] opacity-0 group-hover:opacity-100 transition-all hover:scale-110 nav-arrow"
          >
            <span className="font-bangers text-2xl text-comic-navy">→</span>
          </button>

          {/* Scrollable container */}
          <div
            ref={scrollRef}
            className={`overflow-x-auto pb-4 scrollbar-hide transition-all duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            style={{ transitionDelay: '0.4s' }}
          >
            <div className="flex gap-4 px-6">
              {filteredGames.map((gioco, index) => (
                <div
                  key={gioco.id}
                  className={`stagger-fade-in ${isVisible ? 'visible' : ''}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <GameCard
                    gioco={gioco}
                    index={index}
                    onClick={() => setSelectedGame(gioco)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Empty state */}
        {filteredGames.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4 float-bounce">🎲</div>
            <p className="font-comic text-xl text-comic-navy/60">Nessun gioco trovato in questa categoria.</p>
          </div>
        )}

        {/* Modal */}
        {selectedGame && (
          <Modal gioco={selectedGame} onClose={() => setSelectedGame(null)} associations={associations} />
        )}
      </div>
    </section>
  )
}