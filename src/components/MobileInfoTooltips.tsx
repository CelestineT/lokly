'use client'

import { useEffect, useState } from 'react'

export default function MobileInfoTooltips() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const findInfo = (target: EventTarget | null) => {
      const element = target instanceof Element ? target : null
      return element?.closest('[data-info-tip], span[title][aria-label]') as HTMLElement | null
    }

    const openInfo = (event: Event) => {
      const info = findInfo(event.target)
      if (!info) return false

      const text = info.dataset.infoTip || info.getAttribute('aria-label') || info.getAttribute('title')
      if (!text) return false

      // Le « i » est imbriqué dans la carte <Link>. Il faut neutraliser
      // l'événement avant que Next.js ne transforme le tap en navigation.
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      setMessage(text)
      return true
    }

    const handleTouchStart = (event: TouchEvent) => {
      openInfo(event)
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || event.pointerType === 'pen') openInfo(event)
    }

    const handleClick = (event: MouseEvent) => {
      openInfo(event)
    }

    // capture=true : interception avant le <Link> parent.
    // passive=false : nécessaire pour que preventDefault() soit effectif sur touchstart.
    document.addEventListener('touchstart', handleTouchStart, { capture: true, passive: false })
    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('click', handleClick, true)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart, true)
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('click', handleClick, true)
    }
  }, [])

  if (!message) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-950/25 p-4 sm:items-center"
      role="presentation"
      onClick={() => setMessage(null)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Information"
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700">i</span>
          <p className="text-sm leading-6 text-slate-700">{message}</p>
        </div>
        <button
          type="button"
          onClick={() => setMessage(null)}
          className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
        >
          Fermer
        </button>
      </div>
    </div>
  )
}
