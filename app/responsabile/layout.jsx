import { redirect } from 'next/navigation'
import { requireResponsabile } from '../../src/lib/admin-guard'
import ResponsabileNavbar from '../../src/components/responsabile/ResponsabileNavbar'

export default async function ResponsabileLayout({ children }) {
  const responsabile = await requireResponsabile()
  if (!responsabile) redirect('/')

  return (
    <div className="min-h-screen energized-bg">
      <div className="sticky top-0 z-20 border-b border-editorial-border bg-white">
        <div className="mx-auto flex h-12 max-w-7xl items-center gap-6 overflow-x-auto px-6">
          <span className="shrink-0 font-body text-xs font-semibold uppercase tracking-widest text-editorial-terra">
            Area del responsabile
          </span>
          <ResponsabileNavbar />
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {children}
      </main>
    </div>
  )
}