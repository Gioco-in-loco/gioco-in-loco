'use client'

import NextLink from 'next/link'
import { usePathname, useRouter, useParams as useNextParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

export const Link = NextLink

export function useNavigate() {
  const router = useRouter()

  return (to) => {
    if (typeof to === 'number') {
      if (to < 0) {
        router.back()
        return
      }

      if (to > 0) {
        router.forward()
      }

      return
    }

    router.push(to)
  }
}

export function useLocation() {
  const pathname = usePathname()
  const [locationState, setLocationState] = useState({ search: '', hash: '' })

  useEffect(() => {
    const updateLocationState = () => {
      setLocationState({
        search: window.location.search,
        hash: window.location.hash,
      })
    }

    updateLocationState()
    window.addEventListener('hashchange', updateLocationState)

    return () => {
      window.removeEventListener('hashchange', updateLocationState)
    }
  }, [pathname])

  return useMemo(() => ({
    pathname,
    search: locationState.search,
    hash: locationState.hash,
  }), [locationState, pathname])
}

export function useParams() {
  return useNextParams()
}