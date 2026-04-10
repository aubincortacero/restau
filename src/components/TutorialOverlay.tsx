'use client'

import { useEffect, useState } from 'react'

type Rect = { x: number; y: number; width: number; height: number }

const STEPS = [
  {
    id: 'nav-menu',
    selector: '[data-tutorial="nav-menu"]',
    emoji: '🍽️',
    title: 'Créez votre menu',
    description:
      'Ajoutez vos catégories et vos plats. Vos clients les verront sur leur téléphone via le QR code de chaque table.',
  },
  {
    id: 'nav-tables',
    selector: '[data-tutorial="nav-tables"]',
    emoji: '🪑',
    title: 'Configurez vos tables',
    description:
      'Dessinez votre plan de salle et créez vos tables. Chaque table reçoit un QR code unique à imprimer.',
  },
  {
    id: 'nav-settings',
    selector: '[data-tutorial="nav-settings"]',
    emoji: '💳',
    title: 'Connectez Stripe',
    description:
      "Activez les paiements en ligne depuis vos paramètres en quelques minutes. L'argent est reversé directement sur votre compte.",
  },
  {
    id: 'nav-orders',
    selector: '[data-tutorial="nav-orders"]',
    emoji: '🔔',
    title: 'Suivez vos commandes',
    description:
      "Recevez et gérez les commandes de vos clients en temps réel dès qu'ils scannent leur QR code de table.",
  },
] as const

const STORAGE_KEY = 'qomand_tutorial_v1'
const PAD = 10
const TOOLTIP_W = 288

function snap(selector: string): Rect | null {
  const el = document.querySelector<HTMLElement>(selector)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.left, y: r.top, width: r.width, height: r.height }
}

export default function TutorialOverlay() {
  const [active, setActive] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [ww, setWw] = useState(0)
  const [wh, setWh] = useState(0)
  // Opacités découplées : spotlight glisse, tooltip fade
  const [spotOpacity, setSpotOpacity] = useState(0)
  const [tipOpacity, setTipOpacity] = useState(0)

  function measureNow(idx: number) {
    const r = snap(STEPS[idx].selector)
    setRect(r)
    setWw(window.innerWidth)
    setWh(window.innerHeight)
  }

  // Démarrage auto + écoute restart manuel
  useEffect(() => {
    const doStart = () => {
      setStepIdx(0)
      setSpotOpacity(0)
      setTipOpacity(0)
      setActive(true)
      // Laisser le DOM se stabiliser, mesurer, puis fade-in
      setTimeout(() => {
        measureNow(0)
        requestAnimationFrame(() => requestAnimationFrame(() => {
          setSpotOpacity(1)
          setTimeout(() => setTipOpacity(1), 120)
        }))
      }, 80)
    }

    if (!localStorage.getItem(STORAGE_KEY)) doStart()
    window.addEventListener('tutorial:start', doStart)
    return () => window.removeEventListener('tutorial:start', doStart)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-mesure au resize
  useEffect(() => {
    if (!active) return
    const onResize = () => measureNow(stepIdx)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIdx])

  function goNext() {
    if (stepIdx >= STEPS.length - 1) { finish(); return }
    const nextIdx = stepIdx + 1

    // 1. Fade out le texte du tooltip
    setTipOpacity(0)

    setTimeout(() => {
      // 2. Mesure immédiate du prochain élément → spotlight se déplace en CSS transition
      measureNow(nextIdx)
      setStepIdx(nextIdx)
      // 3. Fade in tooltip une fois le spotlight en mouvement
      requestAnimationFrame(() => requestAnimationFrame(() => setTipOpacity(1)))
    }, 140)
  }

  function finish() {
    setTipOpacity(0)
    setSpotOpacity(0)
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, '1')
      setActive(false)
    }, 320)
  }

  if (!active) return null

  const step = STEPS[stepIdx]

  // Coordonnées spotlight — parqué hors-écran si pas encore mesuré (opacity=0 de toute façon)
  const sx = rect ? rect.x - PAD : -9999
  const sy = rect ? rect.y - PAD : -9999
  const sw = rect ? rect.width + PAD * 2 : 0
  const sh = rect ? rect.height + PAD * 2 : 0

  // Position du tooltip
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
      {/* ── Spotlight — toujours monté, glisse via CSS transition ── */}
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

      {/* ── Bloqueur de clics plein écran (sous le tooltip) ── */}
      <div className="fixed inset-0" style={{ zIndex: 9002 }} />

      {/* ── Tooltip — glisse + fade ────────────────────────── */}
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
          {STEPS.map((_, i) => (
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
            {stepIdx + 1} / {STEPS.length}
          </span>
        </div>

        {/* Contenu */}
        <div className="text-2xl mb-2">{step.emoji}</div>
        <h3 className="text-sm font-bold text-white mb-1.5">{step.title}</h3>
        <p className="text-xs text-zinc-400 leading-relaxed mb-5">{step.description}</p>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={goNext}
            className="flex-1 h-8 px-3 rounded-xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            {stepIdx < STEPS.length - 1 ? 'Suivant →' : '✓ Terminer'}
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
  )
}
