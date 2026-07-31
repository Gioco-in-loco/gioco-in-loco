export default function Card({ children, className = '', glow = true, variant = 'comic', ...props }) {
  if (variant === 'editorial') {
    return (
      <div
        className={`bg-editorial-bg-card rounded-editorial-lg border border-editorial-border shadow-editorial-md p-8 ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }

  if (variant === 'minimal') {
    return (
      <div
        className={`bg-white rounded-soft-lg border border-soft-border shadow-soft-md p-6 ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }

  // Comic variant (default) - enhanced with hover effects
  return (
    <div
      className={`relative bg-white rounded-xl border-3 border-comic-navy overflow-hidden transition-all duration-300 ${
        glow
          ? 'card-glow shadow-[4px 4px 0px 0px_#1A1A2E] hover:shadow-[6px 6px 0px 0px_#1A1A2E] hover:border-comic-magenta'
          : 'shadow-[4px 4px 0px 0px_#1A1A2E]'
      } ${className}`}
      {...props}
    >
      {/* Comic highlight */}
      <div className="absolute top-0 left-0 w-8 h-8 bg-comic-yellow/30 rounded-br-full" />

      {/* Animated border glow on hover */}
      <div className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 pointer-events-none group-hover:opacity-100" style={{
        boxShadow: '0 0 0 3px rgba(0, 212, 255, 0.3), 0 0 20px rgba(0, 212, 255, 0.2)'
      }} />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}