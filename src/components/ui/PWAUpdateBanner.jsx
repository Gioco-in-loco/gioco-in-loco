export default function PWAUpdateBanner({ showBanner, onRefresh }) {
  if (!showBanner) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[1000] bg-comic-cyan border-b-4 border-comic-navy px-4 py-2 shadow-[0_4px_0px_0px_#1A1A2E]">
      <div className="flex items-center justify-center gap-3 max-w-4xl mx-auto">
        <span className="text-xl">🔄</span>
        <p className="font-bangers text-sm text-comic-navy hidden sm:block">
          NUOVA VERSIONE DISPONIBILE! Aggiorna l&apos;app per vedere le ultime modifiche.
        </p>
        <p className="font-bangers text-xs text-comic-navy sm:hidden">
          NUOVA VERSIONE DISPONIBILE!
        </p>
        <button
          onClick={onRefresh}
          className="px-3 py-1 bg-comic-navy text-comic-yellow font-bangers text-sm border-2 border-comic-navy rounded-lg shadow-[1px_1px_0px_0px_#1A1A2E] hover:scale-105 transition-transform"
        >
          AGGIORNA
        </button>
      </div>
    </div>
  )
}