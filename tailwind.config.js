/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        comic: {
          paper: '#F8F6F0',
          cream: '#F0EBE0',
          cyan: '#00D4FF',
          magenta: '#FF1493',
          yellow: '#FFD93D',
          red: '#FF4757',
          orange: '#FF7F50',
          navy: '#1A1A2E',
          dark: '#16213E',
        },
        editorial: {
          bg: '#FAF5F0',
          'bg-card': '#FFFFFF',
          terra: '#C45D3A',
          forest: '#5B7B6A',
          gold: '#C9A227',
          border: '#E5DDD4',
          text: '#2D2A26',
          'text-secondary': '#6B6560',
          'text-muted': '#8A847D',
        },
      },
      fontFamily: {
        display: ['Bangers', 'cursive'],
        body: ['Nunito', 'sans-serif'],
        comic: ['Comic Neue', 'cursive'],
        elegant: ['Fraunces', 'serif'],
        serif: ['Source Serif 4', 'serif'],
      },
      boxShadow: {
        'comic': '4px 4px 0px 0px #1A1A2E',
        'comic-lg': '6px 6px 0px 0px #1A1A2E',
        'comic-hover': '2px 2px 0px 0px #1A1A2E',
        'soft': '0 2px 8px rgba(61, 61, 61, 0.06)',
        'soft-md': '0 4px 12px rgba(61, 61, 61, 0.08)',
        'soft-lg': '0 8px 24px rgba(61, 61, 61, 0.10)',
        'editorial': '0 2px 8px rgba(45, 42, 38, 0.06)',
        'editorial-md': '0 4px 16px rgba(45, 42, 38, 0.08)',
        'editorial-lg': '0 8px 32px rgba(45, 42, 38, 0.10)',
      },
      borderRadius: {
        'soft': '12px',
        'soft-lg': '16px',
        'soft-xl': '24px',
        'editorial': '8px',
        'editorial-lg': '12px',
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'pop': 'pop 0.3s ease-out',
        'halftone': 'halftone 0.5s ease-out',
        'soft-fade': 'softFade 0.5s ease-out',
        'soft-slide': 'softSlideUp 0.6s ease-out',
        'editorial-fade': 'editorialFade 0.6s ease-out',
        'editorial-slide': 'editorialSlideUp 0.7s ease-out',
        'toast-in': 'toastIn 0.25s ease-out',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        pop: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        halftone: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '100% 100%' },
        },
        softFade: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        softSlideUp: {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        editorialFade: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        editorialSlideUp: {
          from: { opacity: 0, transform: 'translateY(24px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        toastIn: {
          from: { opacity: 0, transform: 'translateX(20px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
