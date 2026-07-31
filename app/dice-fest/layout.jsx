import Link from 'next/link'
import DiceFestNavbar from '../../src/components/layout/DiceFestNavbar'
import { WaxSeal } from '../../src/components/dice-fest/decorations'

export default function DiceFestLayout({ children }) {
  return (
    <div className="min-h-screen parchment-bg">
      <div
        className="sticky top-0 z-30 border-b border-editorial-gold/30 backdrop-blur-md"
        style={{ background: 'linear-gradient(180deg, rgba(250, 245, 240, 0.92) 0%, rgba(250, 245, 240, 0.78) 100%)' }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5 md:px-8 lg:px-10">
          <Link
            href="/dice-fest"
            className="group flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <span className="sigil-glow">
              <WaxSeal size={36} label="·" />
            </span>
            <span className="font-elegant text-base font-bold tracking-[0.18em] text-editorial-text">
              DICE FEST
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
