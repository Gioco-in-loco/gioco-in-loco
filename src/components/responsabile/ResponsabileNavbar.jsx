'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const responsabileNavItems = [
  { href: '/responsabile', label: 'Dashboard', exact: true },
  { href: '/responsabile/associazione', label: 'Associazione' },
  { href: '/responsabile/eventi', label: 'Eventi' },
  { href: '/responsabile/oneshots', label: 'One shot' },
  { href: '/responsabile/giochi', label: 'I Nostri Giochi' },
  { href: '/responsabile/analytics', label: 'Analytics' },
]

function isActivePath(pathname, item) {
  if (item.exact) {
    return pathname === item.href
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export default function ResponsabileNavbar() {
  const pathname = usePathname()

  return (
    <nav className="flex shrink-0 items-center gap-1">
      {responsabileNavItems.map((item) => {
        const isActive = isActivePath(pathname, item)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              'shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 font-body text-sm font-semibold transition-colors',
              isActive
                ? 'bg-editorial-forest text-white shadow-soft'
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