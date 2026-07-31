const categoryColors = {
  strategia: 'bg-comic-cyan text-comic-navy',
  cooperativo: 'bg-comic-magenta text-comic-navy',
  party: 'bg-comic-yellow text-comic-navy',
  famiglia: 'bg-comic-orange text-comic-navy',
  familiare: 'bg-comic-orange text-comic-navy',
}

export default function Badge({ children, category, className = '' }) {
  const colorClass = categoryColors[category] || 'bg-comic-cyan text-comic-navy'

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full font-bangers text-sm tracking-wide badge-comic ${colorClass} ${className}`}
    >
      {children}
    </span>
  )
}
