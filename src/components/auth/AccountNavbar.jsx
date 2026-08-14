'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const accountNavItems = [
  { href: '/account', label: 'Dashboard', exact: true },
  { href: '/account/prenotazioni', label: 'Prenotazioni' },
  { href: '/account/profilo', label: 'Profilo' },
]

function isActivePath(pathname, item) {
  if (item.exact) {
    return pathname === item.href
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export default function AccountNavbar() {
  const pathname = usePathname()

  return (
    <nav className="flex shrink-0 items-center gap-1">
      {accountNavItems.map((item) => {
        const isActive = isActivePath(pathname, item)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              'shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 font-body text-sm font-semibold transition-colors',
              isActive
                ? 'bg-editorial-terra text-white shadow-soft'
                : 'text-editorial-text hover:bg-editorial-bg',
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