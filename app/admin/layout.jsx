import { redirect } from 'next/navigation'
import { requireAdmin } from '../../src/lib/admin-guard'
import AdminNavbar from '../../src/components/admin/AdminNavbar'

export default async function AdminLayout({ children }) {
  const admin = await requireAdmin()
  if (!admin) redirect('/')

  return (
    <div className="min-h-screen energized-bg">
      <div className="bg-white border-b border-editorial-border sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center gap-6">
          <span className="font-body text-xs uppercase tracking-widest text-editorial-terra font-semibold shrink-0">
            Admin
          </span>
          <AdminNavbar />
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
