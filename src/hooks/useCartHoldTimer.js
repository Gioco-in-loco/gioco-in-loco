'use client'

import { useEffect, useRef, useState } from 'react'
import { getTimeRemainingLabel } from '../lib/cart-ui'

export function useCartHoldTimer(holdExpiresAt, onExpire) {
  const [timeRemaining, setTimeRemaining] = useState(() => getTimeRemainingLabel(holdExpiresAt))
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    setTimeRemaining(getTimeRemainingLabel(holdExpiresAt))

    if (!holdExpiresAt) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      const nextValue = getTimeRemainingLabel(holdExpiresAt)
      setTimeRemaining(nextValue)

      if (nextValue === '00:00') {
        window.clearInterval(intervalId)
        onExpireRef.current?.()
      }
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [holdExpiresAt])

  return timeRemaining
}