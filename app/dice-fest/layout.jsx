import Link from 'next/link'
import DiceFestNavbar from '../../src/components/layout/DiceFestNavbar'

export default function DiceFestLayout({ children }) {
  return (
    <div className="dicefest-scope dicefest-bg min-h-screen">
      <div className="sticky top-0 z-30 border-b-2 border-dicefest-border bg-dicefest-ink/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center gap-6 px-5 md:px-8 lg:px-10">
          <Link
            href="/dice-fest"
            className="group flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <img src="/dice-fest/dado.png" alt="" className="h-9 w-9 object-contain" />
            <span className="font-df-display text-lg uppercase tracking-wide text-dicefest-paper">
              Dice<span className="text-dicefest-pink">Fest</span>
            </span>
          </Link>

          <div className="ml-auto">
            <DiceFestNavbar />
          </div>
        </div>
      </div>

      <main>{children}</main>
    </div>
  )
}
