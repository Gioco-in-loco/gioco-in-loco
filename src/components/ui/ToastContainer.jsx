'use client'

import Toast from './Toast'
import { useToast } from '../../context/ToastContext'

export default function ToastContainer() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-4 left-1/2 z-[1000] flex -translate-x-1/2 flex-col items-center gap-2 pointer-events-none"
      aria-label="Notifiche"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  )
}
