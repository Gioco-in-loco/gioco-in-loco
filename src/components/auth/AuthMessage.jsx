export default function AuthMessage({ type = 'info', children }) {
  if (!children) {
    return null
  }

  const palette = {
    error: 'bg-red-50 border-2 border-red-200 text-red-700 rounded-lg',
    success: 'bg-emerald-50 border-2 border-emerald-200 text-emerald-700 rounded-lg',
    info: 'bg-editorial-terra/5 border-2 border-editorial-border text-editorial-text-secondary rounded-lg',
  }

  return (
    <div className={`mb-4 rounded-editorial border px-4 py-3 font-body text-sm ${palette[type]}`}>
      {children}
    </div>
  )
}