'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dice-fest', label: 'Homepage', exact: true },
  { href: '/dice-fest/sessioni', label: 'Sessioni' },
  { href: '/dice-fest/carrello', label: 'Ordine' },
]

function isActivePath(pathname, item) {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export default function DiceFestNavbar() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-4 sm:gap-6">
      {NAV_ITEMS.map((item) => {
        const isActive = isActivePath(pathname, item)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              'font-df-mono text-xs font-bold uppercase tracking-wide transition-colors sm:text-sm',
              isActive
                ? 'text-dicefest-pink underline decoration-2 underline-offset-4'
                : 'text-dicefest-paper/70 hover:text-dicefest-green',
            ].join(' ')}
            aria-current={isActive ? 'page' : undefined}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
