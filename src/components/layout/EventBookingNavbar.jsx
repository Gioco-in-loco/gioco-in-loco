'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function isActivePath(pathname, item) {
  if (item.exact) {
    return pathname === item.href
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export default function EventBookingNavbar({ bookingConfig }) {
  const pathname = usePathname()
  const navItems = [
    ...(bookingConfig.navLabelEvent && bookingConfig.navLabelEvent !== bookingConfig.displayName
      ? [{ href: bookingConfig.routeBasePath, label: bookingConfig.navLabelEvent, exact: true }]
      : []),
    { href: `${bookingConfig.routeBasePath}/prenotazioni`, label: bookingConfig.navLabelBooking },
    { href: `${bookingConfig.routeBasePath}/carrello`, label: bookingConfig.navLabelCart },
  ]

  return (
    <nav className="flex items-center gap-1">
      {navItems.map((item) => {
        const isActive = isActivePath(pathname, item)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              'rounded-lg px-3 py-1.5 font-body text-sm font-semibold transition-colors',
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