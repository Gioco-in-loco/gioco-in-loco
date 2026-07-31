'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageView } from '../../lib/analytics/browser'

const EXCLUDED_PREFIXES = ['/admin']

export default function AnalyticsTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname || EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return
    }

    trackPageView(pathname)
  }, [pathname])

  return null
}