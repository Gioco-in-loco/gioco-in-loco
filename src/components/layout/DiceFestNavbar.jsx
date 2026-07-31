'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dice-fest', label: 'Homepage', exact: true },
  { href: '/dice-fest/prenotazioni', label: 'Registro missioni' },
  { href: '/dice-fest/carrello', label: 'Ordine' },
]

function isActivePath(pathname, item) {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export default function DiceFestNavbar() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = isActivePath(pathname, item)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              'rounded-full px-3.5 py-1.5 font-elegant text-sm font-semibold transition-all',
              isActive
                ? 'bg-editorial-terra text-editorial-bg shadow-[0_4px_10px_-4px_rgba(196,93,58,0.5)]'
                : 'text-editorial-text-secondary hover:text-editorial-terra',
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
