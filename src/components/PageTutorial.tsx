'use client'

import { useEffect, useState } from 'react'

export type PageTutorialStep = {
  selector: string
  emoji: string
  title: string
  description: string
}

type Rect = { x: number; y: number; width: number; height: number }

const PAD = 10
const TOOLTIP_W = 288

function snapEl(selector: string): Rect | null {
  const el = document.querySelector<HTMLElement>(selector)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.left, y: r.top, width: r.width, height: r.height }
}

export default function PageTutorial({
  steps,
  storageKey,
}: {
  steps: PageTutorialStep[]
  storageKey: string
}) {
  const [mounted, setMounted] = useState(false)
  const [active, setActive] = useState(false)
  const [validSteps, setValidSteps] = useState<PageTutorialStep[]>([])
  const [stepIdx, setStepIdx] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [ww, setWw] = useState(0)
  const [wh, setWh] = useState(0)
  const [spotOpacity, setSpotOpacity] = useState(0)
  const [tipOpacity, setTipOpacity] = useState(0)

  function measureNow(idx: number, stepsArr: PageTutorialStep[]) {
    const r = snapEl(stepsArr[idx].selector)
    setRect(r)
    setWw(window.innerWidth)
    setWh(window.innerHeight)
  }

  function doStart() {
    const filtered = steps.filter((s) => !!document.querySelector(s.selector))
    if (filtered.length === 0) return
    setValidSteps(filtered)
    setStepIdx(0)
    setSpotOpacity(0)
    setTipOpacity(0)
    setActive(true)
    setTimeout(() => {
      measureNow(0, filtered)
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setSpotOpacity(1)
          setTimeout(() => setTipOpacity(1), 120)
        }),
      )
    }, 80)
  }

  // Auto-start on first visit
  useEffect(() => {
    setMounted(true)
    if (!localStorage.getItem(storageKey)) {
      setTimeout(doStart, 350)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  // Re-measure on resize
  useEffect(() => {
    if (!active) return
    const onResize = () => measureNow(stepIdx, validSteps)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIdx, validSteps])

  function goNext() {
    if (stepIdx >= validSteps.length - 1) { finish(); return }
    const nextIdx = stepIdx + 1
    setTipOpacity(0)
    setTimeout(() => {
      measureNow(nextIdx, validSteps)
      setStepIdx(nextIdx)
      requestAnimationFrame(() => requestAnimationFrame(() => setTipOpacity(1)))
    }, 140)
  }

  function finish() {
    setTipOpacity(0)
    setSpotOpacity(0)
    setTimeout(() => {
      localStorage.setItem(storageKey, '1')
      setActive(false)
    }, 320)
  }

  const step = validSteps[stepIdx]
  const sx = rect ? rect.x - PAD : -9999
  const sy = rect ? rect.y - PAD : -9999
  const sw = rect ? rect.width + PAD * 2 : 0
  const sh = rect ? rect.height + PAD * 2 : 0

  let tooltipLeft = ww / 2 - TOOLTIP_W / 2
  let tooltipTop = wh / 2 - 110
  if (rect && ww > 0) {
    const rightSpace = ww - (sx + sw)
    if (rightSpace >= TOOLTIP_W + 24) {
      tooltipLeft = sx + sw + 16
      tooltipTop = Math.max(16, Math.min(sy + sh / 2 - 110, wh - 260))
    } else {
      tooltipLeft = Math.max(16, Math.min(sx, ww - TOOLTIP_W - 16))
      tooltipTop = Math.max(16, Math.min(sy + sh + 16, wh - 260))
    }
  }

  const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)'
  const DUR = '380ms'

  return (
    <>
      {/* ── Bouton ? — toujours visible quand le tuto est inactif ── */}
      {mounted && !active && (
        <button
          onClick={doStart}
          className="fixed bottom-6 right-6 xl:right-72 z-40 w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center shadow-lg transition-all cursor-pointer"
          title="Aide sur cette page"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
          </svg>
        </button>
      )}

      {/* ── Overlay (uniquement quand actif) ─────────────────── */}
      {active && step && (
        <>
          {/* Spotlight */}
          <div
            className="fixed pointer-events-none"
            style={{
              zIndex: 9001,
              left: sx,
              top: sy,
              width: sw,
              height: sh,
              borderRadius: 10,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.78)',
              outline: '1.5px solid rgba(231,111,81,0.65)',
              outlineOffset: '1px',
              opacity: spotOpacity,
              transition: [
                `left ${DUR} ${EASE}`,
                `top ${DUR} ${EASE}`,
                `width ${DUR} ${EASE}`,
                `height ${DUR} ${EASE}`,
                'opacity 280ms ease',
              ].join(', '),
              willChange: 'left, top, width, height',
            }}
          />

          {/* Bloqueur de clics */}
          <div className="fixed inset-0" style={{ zIndex: 9002 }} />

          {/* Tooltip */}
          <div
            className="fixed bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl p-5 select-none"
            style={{
              zIndex: 9010,
              left: tooltipLeft,
              top: tooltipTop,
              width: TOOLTIP_W,
              opacity: tipOpacity,
              transition: [
                'opacity 180ms ease',
                `left ${DUR} ${EASE}`,
                `top ${DUR} ${EASE}`,
              ].join(', '),
              willChange: 'left, top',
            }}
          >
            {/* Barre de progression */}
            <div className="flex items-center gap-1.5 mb-4">
              {validSteps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === stepIdx
                      ? 'bg-orange-500 w-6'
                      : i < stepIdx
                      ? 'bg-orange-500/35 w-3'
                      : 'bg-zinc-700 w-3'
                  }`}
                />
              ))}
              <span className="ml-auto text-[10px] text-zinc-600 tabular-nums shrink-0">
                {stepIdx + 1} / {validSteps.length}
              </span>
            </div>

            <div className="text-2xl mb-2">{step.emoji}</div>
            <h3 className="text-sm font-bold text-white mb-1.5">{step.title}</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-5">{step.description}</p>

            <div className="flex items-center gap-2">
              <button
                onClick={goNext}
                className="flex-1 h-8 px-3 rounded-xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                {stepIdx < validSteps.length - 1 ? 'Suivant →' : '✓ Terminé'}
              </button>
              <button
                onClick={finish}
                className="h-8 px-3 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 text-xs transition-colors cursor-pointer"
              >
                Passer
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
