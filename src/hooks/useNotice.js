'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '../context/ToastContext'

const NOTICES = {
  email_changed: { type: 'success', message: 'Email aggiornata correttamente.' },
  password_reset: { type: 'success', message: 'Password reimpostata.' },
  account_activated: { type: 'success', message: 'Account attivato. Benvenuto!' },
}

export function useNotice() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const toast = useToast()
  const consumedRef = useRef(new Set())

  useEffect(() => {
    const notice = searchParams.get('notice')
    if (!notice) return

    const key = `${pathname}:${notice}`
    if (consumedRef.current.has(key)) return
    consumedRef.current.add(key)

    const config = NOTICES[notice]
    if (config) {
      toast[config.type](config.message)
    }

    const params = new URLSearchParams(searchParams.toString())
    params.delete('notice')
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [searchParams, pathname, router, toast])
}
