'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const adminNavItems = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/associazioni', label: 'Associazioni' },
  { href: '/admin/eventi', label: 'Eventi' },
  { href: '/admin/oneshots', label: 'One shot' },
  { href: '/admin/main-events', label: 'Main event' },
  { href: '/admin/giochi', label: 'I Nostri Giochi' },
  { href: '/admin/utenti', label: 'Utenti' },
  { href: '/admin/analytics', label: 'Analytics' },
]

function isActivePath(pathname, item) {
  if (item.exact) {
    return pathname === item.href
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export default function AdminNavbar() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1">
      {adminNavItems.map((item) => {
        const isActive = isActivePath(pathname, item)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              'px-3 py-1.5 rounded-lg font-body text-sm font-semibold transition-colors',
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