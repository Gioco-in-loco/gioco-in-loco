'use client'

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from '../../lib/router'

export default function AssociazionePage({ association }) {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef(null)
  const navigate = useNavigate()
  const assoc = association

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

  if (!assoc) {
    return (
      <div className="min-h-screen flex items-center justify-center energized-bg">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-editorial-terra/10 flex items-center justify-center float-energized">
            <svg className="w-8 h-8 text-editorial-terra" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="font-body text-lg text-editorial-text-muted">Associazione non trovata</p>
        </div>
      </div>
    )
  }

  return (
    <section id="associazione" ref={sectionRef} className="relative py-20 px-6 energized-bg min-h-screen">
      {/* Dice pattern background */}
      <div className="absolute inset-0 dice-pattern-energized opacity-50 pointer-events-none pattern-drift" />

      {/* Decorative elements */}
      <div className="absolute top-20 right-10 w-24 h-24 rounded-full bg-editorial-terra/10" />
      <div className="absolute bottom-40 left-10 w-16 h-16 rounded-full bg-editorial-forest/10" />

      <div className="relative max-w-3xl mx-auto">

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-12 flex items-center gap-2 font-body text-sm text-editorial-text-secondary hover:text-editorial-terra transition-colors group"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <span>Torna al sito</span>
        </button>

        {/* Header */}
        <div
          className={`text-center mb-12 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          <div className={`w-24 h-24 mx-auto mb-6 rounded-xl border-2 border-editorial-border shadow-soft-md flex items-center justify-center bg-white ${assoc.logo ? '' : 'bg-editorial-terra/10'} group-hover:scale-110 transition-transform`}>
            {assoc.logo ? (
              <img
                src={assoc.logo}
                alt={assoc.name}
                className="w-full h-full object-contain p-2"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.parentElement.classList.remove('bg-white')
                  e.target.parentElement.classList.add('flex', 'items-center', 'justify-center', 'bg-editorial-terra/10')
                  e.target.parentElement.innerHTML = `<span class="font-elegant text-3xl text-editorial-terra font-bold">${assoc.name.charAt(0)}</span>`
                }}
              />
            ) : (
              <span className="font-elegant text-3xl text-editorial-terra font-bold">
                {assoc.name.charAt(0)}
              </span>
            )}
          </div>
          <h1 className="font-elegant text-4xl md:text-5xl text-editorial-text mb-4 font-bold">
            {assoc.name}
          </h1>
        </div>

        {/* Bio */}
        <div
          className={`mb-10 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          style={{ transitionDelay: '0.2s' }}
        >
          <h2 className="font-body text-xs uppercase tracking-widest text-editorial-terra mb-4 text-center">
            Chi siamo
          </h2>
          <div className="card-surface p-8">
            <p className="font-body text-editorial-text text-lg leading-relaxed whitespace-pre-line">
              {assoc.bio}
            </p>
          </div>
        </div>

        {/* Location info */}
        {assoc.location && assoc.location.address !== 'N/A' && (
          <div
            className={`mb-10 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: '0.3s' }}
          >
            <h2 className="font-body text-xs uppercase tracking-widest text-editorial-forest mb-4 text-center">
              Dove trovarci
            </h2>
            <div className="card-surface p-8">
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-editorial-forest/10 flex items-center justify-center flex-shrink-0 float-energized">
                    <svg className="w-5 h-5 text-editorial-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-body text-editorial-text font-semibold">{assoc.location.address}</p>
                    <p className="font-body text-editorial-text-secondary">{assoc.location.city}</p>
                  </div>
                </div>
                {assoc.location.openingHours && assoc.location.openingHours !== 'N/A' && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-editorial-terra/10 flex items-center justify-center flex-shrink-0 float-energized" style={{ animationDelay: '0.2s' }}>
                      <svg className="w-5 h-5 text-editorial-terra" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-body text-editorial-text font-semibold">{assoc.location.openingHours}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Social links */}
        <div className="flex items-center justify-center gap-3 flex-wrap pt-4">
          {assoc.social.instagram && (
            <a
              href={assoc.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-editorial-border rounded-lg font-body text-sm text-editorial-text hover:border-editorial-terra hover:text-editorial-terra hover:scale-105 transition-all"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              <span>@{assoc.social.instagram.split('/').pop()}</span>
            </a>
          )}
          {assoc.social.facebook && (
            <a
              href={assoc.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-editorial-border rounded-lg font-body text-sm text-editorial-text hover:border-blue-600 hover:text-blue-600 hover:scale-105 transition-all"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              <span>Facebook</span>
            </a>
          )}
          {assoc.social.email && (
            <a
              href={`mailto:${assoc.social.email}`}
              className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-editorial-border rounded-lg font-body text-sm text-editorial-text hover:border-editorial-terra hover:text-editorial-terra hover:scale-105 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/></svg>
              <span>Email</span>
            </a>
          )}
          {assoc.social.website && (
            <a
              href={assoc.social.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-editorial-border rounded-lg font-body text-sm text-editorial-text hover:border-editorial-forest hover:text-editorial-forest hover:scale-105 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <span>Sito</span>
            </a>
          )}
        </div>
      </div>
    </section>
  )
}