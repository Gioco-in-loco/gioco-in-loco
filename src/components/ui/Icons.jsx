// Shared inline SVG icon set — same hand-rolled style used across the app
// (decorations.jsx, AccountPage, PasswordInput): 24x24 grid, ~1.6-1.8 stroke,
// round caps/joins. Used in place of emoji for decorative/structural icons.

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function DiceIcon({ className = '' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="8.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function SwordIcon({ className = '' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M14.5 3.5 20 9l-2 2-5.5-5.5z" />
      <path d="M13 8 5 16l-1.5 3.5L7 18l8-8" />
      <path d="M9.5 14.5 12 17" />
    </svg>
  )
}

export function ShieldIcon({ className = '' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M12 3.5 19 6.5v5c0 4.2-2.9 7.4-7 8.5-4.1-1.1-7-4.3-7-8.5v-5z" />
      <path d="M9 12l2 2 4-4.5" />
    </svg>
  )
}

export function TicketIcon({ className = '' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M4 8.5a2 2 0 0 1 0-3V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v.5a2 2 0 0 1 0 3v6a2 2 0 0 1 0 3v.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-.5a2 2 0 0 1 0-3z" />
      <path d="M14 4.5v15" strokeDasharray="2 2.5" />
    </svg>
  )
}

export function CalendarIcon({ className = '' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </svg>
  )
}

export function PeopleIcon({ className = '' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19c.6-3 2.7-4.8 5.5-4.8s4.9 1.8 5.5 4.8" />
      <path d="M15.5 6.2a3 3 0 0 1 0 5.9" />
      <path d="M16.5 14.4c2.2.5 3.6 2.1 4 4.6" />
    </svg>
  )
}

export function MapPinIcon({ className = '' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  )
}

export function SparkleIcon({ className = '' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M7 7l2 2M17 7l-2 2M7 17l2-2M17 17l-2-2" />
    </svg>
  )
}

export function ArrowRightIcon({ className = '' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M4 12h16M14 6l6 6-6 6" />
    </svg>
  )
}
