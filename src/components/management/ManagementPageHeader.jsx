'use client'

import TutorialPopup from '../tutorial/TutorialPopup'

export default function ManagementPageHeader({ eyebrow = 'Gestione', title, description = null, actions = null, tutorialSlides = null }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <p className="mb-1 font-body text-xs font-semibold uppercase tracking-widest text-editorial-terra">{eyebrow}</p>
        <div className="flex items-center gap-2">
          <h1 className="font-elegant text-3xl font-bold text-editorial-text">{title}</h1>
          {tutorialSlides ? <TutorialPopup label={title} slides={tutorialSlides} /> : null}
        </div>
        {description ? <p className="mt-2 font-body text-sm text-editorial-text-secondary">{description}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  )
}