'use client'

import { useEffect, useState } from 'react'

export default function MobileTooltipGuard() {
  const [text, setText] = useState<string | null>(null)

  useEffect(() => {
    const handlePointer = (event: Event) => {
      const target = event.target as HTMLElement | null
      const info = target?.closest?.('[data-info-tooltip], span[title][aria-label]') as HTMLElement | null
      if (!info) return

      const message = info.getAttribute('data-info-tooltip') || info.getAttribute('aria-label') || info.getAttribute('title')
      if (!message) return

      // Important : l'infobulle est parfois imbriquée dans un <Link> de carte.
      // On bloque donc la navigation dès la phase de capture, avant que Next.js
      // ne reçoive le clic sur le lien parent.
      event.preventDefault()
      event.stopPropagation()
      if ('stopImmediatePropagation' in event) event.stopImmediatePropagation()
      setText(message)
    }

    document.addEventListener('click', handlePointer, true)
    return () => document.removeEventListener('click', handlePointer, true)
  }, [])

  if (!text) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/25 p-4"
      role="presentation"
      onClick={() => setText(null)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Information"
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Information</p>
            <p className="mt-2 text-sm leading-5 text-slate-600">{text}</p>
          </div>
          <button
            type="button"
            aria-label="Fermer l'information"
            onClick={() => setText(null)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-600"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
