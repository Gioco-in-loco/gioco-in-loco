'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState, ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  type: ToastType
  message: string
  duration: number
}

interface ToastContextType {
  toasts: Toast[]
  show: (type: ToastType, message: string, duration?: number) => number
  success: (message: string, duration?: number) => number
  error: (message: string, duration?: number) => number
  info: (message: string, duration?: number) => number
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

const MAX_TOASTS = 4
const DEFAULT_DURATION = 5000
const ERROR_DURATION = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = ++idRef.current
    const finalDuration = duration ?? (type === 'error' ? ERROR_DURATION : DEFAULT_DURATION)
    const toast: Toast = { id, type, message, duration: finalDuration }

    setToasts((current) => {
      const next = [...current, toast]
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next
    })

    if (finalDuration > 0) {
      const timer = setTimeout(() => dismiss(id), finalDuration)
      timersRef.current.set(id, timer)
    }

    return id
  }, [dismiss])

  const value = useMemo<ToastContextType>(() => ({
    toasts,
    show,
    success: (message, duration) => show('success', message, duration),
    error: (message, duration) => show('error', message, duration),
    info: (message, duration) => show('info', message, duration),
    dismiss,
  }), [toasts, show, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}
