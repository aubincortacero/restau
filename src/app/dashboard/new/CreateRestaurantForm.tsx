'use client'

import { useState, useTransition, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { createRestaurantFull } from '@/app/actions/restaurant'
import { createConnectOnboardingLink } from '@/app/actions/stripe-connect'
import { IconLogo } from '@/components/icons'

const DAYS = [
  { key: 'mon', label: 'Lun' },
  { key: 'tue', label: 'Mar' },
  { key: 'wed', label: 'Mer' },
  { key: 'thu', label: 'Jeu' },
  { key: 'fri', label: 'Ven' },
  { key: 'sat', label: 'Sam' },
  { key: 'sun', label: 'Dim' },
]

type OpeningHours = Record<string, { open: string; close: string; closed: boolean }>

const DEFAULT_HOURS: OpeningHours = {
  mon: { open: '12:00', close: '22:00', closed: false },
  tue: { open: '12:00', close: '22:00', closed: false },
  wed: { open: '12:00', close: '22:00', closed: false },
  thu: { open: '12:00', close: '22:00', closed: false },
  fri: { open: '12:00', close: '23:00', closed: false },
  sat: { open: '12:00', close: '23:00', closed: false },
  sun: { open: '12:00', close: '22:00', closed: true },
}

type WizardData = {
  name: string
  address: string
  phone: string
  paymentMethods: ('online' | 'cash')[]
  fulfillmentModes: ('table' | 'pickup')[]
  openingHours: OpeningHours
  happyHour: { enabled: boolean; start: string; end: string; days: string[] }
}

type Step = 'info' | 'payment' | 'service' | 'hours' | 'happyhour' | 'stripe'
const STEPS: Step[] = ['info', 'payment', 'service', 'hours', 'happyhour', 'stripe']
const STEP_DESCRIPTIONS = [
  'Donnez un nom et une adresse à votre restaurant.',
  'Choisissez comment vos clients règlent leur commande.',
  'Comment vos clients récupèrent leur commande ?',
  'Définissez vos horaires d\'ouverture.',
  'Activez une période Happy Hour si vous le souhaitez.',
]

const INPUT = 'w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500'
const TIME_INPUT = 'bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 w-20 text-center tabular-nums'

function TimeBar({ open, close }: { open: string; close: string }) {
  const toPercent = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return ((h * 60 + m) / (24 * 60)) * 100
  }
  const leftPct = toPercent(open)
  const closePct = toPercent(close)
  const crossesMidnight = closePct < leftPct
  return (
    <div className="relative h-1.5 bg-zinc-700 rounded-full my-2">
      {[0, 6, 12, 18, 24].map(h => (
        <div key={h} className="absolute top-0 h-full w-px bg-zinc-600" style={{ left: `${(h / 24) * 100}%` }} />
      ))}
      {crossesMidnight ? (
        <>
          <div className="absolute top-0 h-full bg-orange-500 rounded-l-full transition-all duration-200" style={{ left: `${leftPct}%`, width: `${100 - leftPct}%` }} />
          <div className="absolute top-0 h-full bg-orange-400/50 rounded-r-full transition-all duration-200" style={{ left: 0, width: `${closePct}%` }} />
        </>
      ) : (
        <div className="absolute top-0 h-full bg-orange-500 rounded-full transition-all duration-200" style={{ left: `${leftPct}%`, width: `${Math.max(0, closePct - leftPct)}%` }} />
      )}
    </div>
  )
}

function ToggleCard({
  selected,
  onClick,
  icon,
  title,
  sub,
}: {
  selected: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  sub: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
        selected
          ? 'border-orange-500 bg-orange-500/8'
          : 'border-zinc-700 bg-zinc-800/40 hover:border-zinc-600'
      }`}
    >
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${selected ? 'bg-orange-500/20' : 'bg-zinc-700'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${selected ? 'text-white' : 'text-zinc-300'}`}>{title}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>
      </div>
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? 'border-orange-500 bg-orange-500' : 'border-zinc-600'}`}>
        {selected && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        )}
      </div>
    </button>
  )
}

export default function CreateRestaurantForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<Step>('info')
  const [error, setError] = useState<string | null>(null)
  const [createdRestaurantId, setCreatedRestaurantId] = useState<string | null>(null)

  const [data, setData] = useState<WizardData>({
    name: '',
    address: '',
    phone: '',
    paymentMethods: ['online', 'cash'],
    fulfillmentModes: ['table'],
    openingHours: DEFAULT_HOURS,
    happyHour: { enabled: false, start: '18:00', end: '20:00', days: ['mon', 'tue', 'wed', 'thu', 'fri'] },
  })

  const stepIdx = STEPS.indexOf(step)

  function goNext() {
    if (step === 'happyhour') {
      submit()
    } else {
      setStep(STEPS[stepIdx + 1])
    }
  }

  function goPrev() {
    if (stepIdx > 0) setStep(STEPS[stepIdx - 1])
  }

  function submit() {
    setError(null)
    startTransition(async () => {
      const result = await createRestaurantFull(data)
      if (result.error) {
        setError(result.error)
      } else {
        if (result.restaurantId) setCreatedRestaurantId(result.restaurantId)
        setStep('stripe')
      }
    })
  }

  function toggle<T extends string>(arr: T[], val: T): T[] {
    const has = arr.includes(val)
    const next = has ? arr.filter(x => x !== val) : [...arr, val]
    return next.length ? next : [val]
  }

  function applyHoursToAll(sourceDay: string) {
    const src = data.openingHours[sourceDay]
    setData(prev => ({
      ...prev,
      openingHours: Object.fromEntries(
        DAYS.map(d => [d.key, { ...prev.openingHours[d.key], open: src.open, close: src.close }])
      ),
    }))
  }

  // ── Stripe step ──────────────────────────────────────────────
  if (step === 'stripe') {
    return (
      <div className="flex flex-col items-center text-center px-2">
        {/* Logo pairing */}
        <div className="flex items-center gap-3 mb-8">
          {/* Qomand */}
          <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            </svg>
          </div>
          {/* Lien */}
          <div className="flex items-center gap-1">
            <div className="w-2 h-0.5 bg-zinc-600 rounded-full" />
            <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
            <div className="w-2 h-0.5 bg-zinc-600 rounded-full" />
          </div>
          {/* Stripe */}
          <div className="w-14 h-14 rounded-2xl bg-[#635bff] flex items-center justify-center shadow-lg shadow-[#635bff]/30">
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
            </svg>
          </div>
        </div>

        <h2 className="text-xl font-bold text-white mb-2">Qomand × Stripe</h2>
        <p className="text-sm text-zinc-400 mb-8 max-w-xs leading-relaxed">
          Liez votre compte Stripe pour accepter les paiements par carte directement à table. Les fonds arrivent sur votre IBAN sous 2 jours.
        </p>
        <div className="w-full flex flex-col gap-3 max-w-sm">
          <form action={createConnectOnboardingLink} className="w-full">
            {createdRestaurantId && (
              <input type="hidden" name="restaurantId" value={createdRestaurantId} />
            )}
            <button
              type="submit"
              className="w-full bg-[#635bff] hover:bg-[#4f46e5] text-white font-bold py-4 rounded-2xl transition-colors text-sm cursor-pointer shadow-lg shadow-[#635bff]/20"
            >
              Lier mon compte Stripe
            </button>
          </form>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-zinc-500 hover:text-zinc-300 py-3 transition-colors"
          >
            Passer — configurer plus tard
          </button>
        </div>
      </div>
    )
  }

  // ── Stepper header ───────────────────────────────────────────
  const visibleSteps = STEPS.filter(s => s !== 'stripe')
  const visibleIdx = visibleSteps.indexOf(step)

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header dynamique */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-500 mb-4">
          <IconLogo className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Créer votre restaurant</h1>
        <p className="text-sm text-zinc-400 mt-1">{STEP_DESCRIPTIONS[visibleIdx]}</p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center mb-8">
        {visibleSteps.map((s, i) => (
          <Fragment key={s}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
              i < visibleIdx ? 'bg-orange-500 text-white' :
              i === visibleIdx ? 'bg-orange-500 text-white ring-4 ring-orange-500/20' :
              'bg-zinc-800 text-zinc-500'
            }`}>
              {i < visibleIdx
                ? <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                : i + 1
              }
            </div>
            {i < visibleSteps.length - 1 && (
              <div className={`w-10 h-0.5 transition-colors ${i < visibleIdx ? 'bg-orange-500' : 'bg-zinc-700'}`} />
            )}
          </Fragment>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-950 border border-red-800 text-sm text-red-300">{error}</div>
      )}

      {/* ── Step: Info ─────────────────────────────────────────── */}
      {step === 'info' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nom du restaurant <span className="text-red-400">*</span></label>
            <input value={data.name} onChange={e => setData(p => ({ ...p, name: e.target.value }))} placeholder="Le Petit Bistrot" className={INPUT} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Adresse</label>
            <input value={data.address} onChange={e => setData(p => ({ ...p, address: e.target.value }))} placeholder="12 rue de la Paix, Paris" className={INPUT} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Téléphone</label>
            <input value={data.phone} onChange={e => setData(p => ({ ...p, phone: e.target.value }))} type="tel" placeholder="06 00 00 00 00" className={INPUT} />
          </div>
        </div>
      )}

      {/* ── Step: Payment ──────────────────────────────────────── */}
      {step === 'payment' && (
        <div className="space-y-3">
          <p className="text-zinc-400 text-sm mb-4">Vous pourrez modifier ça dans les paramètres.</p>
          <ToggleCard
            selected={data.paymentMethods.includes('online')}
            onClick={() => setData(p => ({ ...p, paymentMethods: toggle(p.paymentMethods, 'online') }))}
            title="Paiement en ligne"
            sub="Le client paie par carte depuis son téléphone"
            icon={<svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg>}
          />
          <ToggleCard
            selected={data.paymentMethods.includes('cash')}
            onClick={() => setData(p => ({ ...p, paymentMethods: toggle(p.paymentMethods, 'cash') }))}
            title="Paiement à la caisse"
            sub="Le client règle en espèces ou carte à la fin"
            icon={<svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>}
          />
        </div>
      )}

      {/* ── Step: Service ──────────────────────────────────────── */}
      {step === 'service' && (
        <div className="space-y-3">
          <p className="text-zinc-400 text-sm mb-4">Comment vos clients récupèrent leur commande ?</p>
          <ToggleCard
            selected={data.fulfillmentModes.includes('table')}
            onClick={() => setData(p => ({ ...p, fulfillmentModes: toggle(p.fulfillmentModes, 'table') }))}
            title="Livré à la table"
            sub="Le serveur apporte la commande directement"
            icon={<span className="text-2xl">🍽️</span>}
          />
          <ToggleCard
            selected={data.fulfillmentModes.includes('pickup')}
            onClick={() => setData(p => ({ ...p, fulfillmentModes: toggle(p.fulfillmentModes, 'pickup') }))}
            title="Retrait au comptoir"
            sub="Le client récupère sa commande avec un code"
            icon={<span className="text-2xl">🛍️</span>}
          />
        </div>
      )}

      {/* ── Step: Hours ────────────────────────────────────────── */}
      {step === 'hours' && (
        <div>
          <p className="text-zinc-400 text-sm mb-4">Définissez vos horaires d'ouverture. Cliquez sur "Appliquer à tous" pour uniformiser.</p>
          {/* Légende barre */}
          <div className="flex justify-between text-[10px] text-zinc-600 mb-1 px-0.5">
            <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span>
          </div>
          <div className="space-y-1">
            {DAYS.map(d => {
              const h = data.openingHours[d.key]
              return (
                <div key={d.key} className={`rounded-xl p-3 transition-colors ${h.closed ? 'bg-zinc-900/50' : 'bg-zinc-800/60'}`}>
                  <div className="flex items-center gap-3">
                    {/* Jour + toggle fermé */}
                    <button
                      type="button"
                      onClick={() => setData(p => ({
                        ...p,
                        openingHours: { ...p.openingHours, [d.key]: { ...p.openingHours[d.key], closed: !h.closed } },
                      }))}
                      className={`w-10 text-center text-xs font-bold rounded-lg py-1.5 shrink-0 transition-colors ${
                        h.closed ? 'bg-zinc-700 text-zinc-500' : 'bg-orange-500 text-white'
                      }`}
                    >
                      {d.label}
                    </button>
                    {h.closed ? (
                      <span className="text-xs text-zinc-600 flex-1">Fermé</span>
                    ) : (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="time"
                          value={h.open}
                          onChange={e => setData(p => ({
                            ...p,
                            openingHours: { ...p.openingHours, [d.key]: { ...p.openingHours[d.key], open: e.target.value } },
                          }))}
                          className={TIME_INPUT}
                        />
                        <span className="text-zinc-600 text-xs">→</span>
                        <input
                          type="time"
                          value={h.close}
                          onChange={e => setData(p => ({
                            ...p,
                            openingHours: { ...p.openingHours, [d.key]: { ...p.openingHours[d.key], close: e.target.value } },
                          }))}
                          className={TIME_INPUT}
                        />
                        {(() => {
                          const [oh, om] = h.open.split(':').map(Number)
                          const [ch, cm] = h.close.split(':').map(Number)
                          return (oh * 60 + om) > (ch * 60 + cm) ? (
                            <span className="text-[10px] font-semibold text-orange-400 shrink-0" title="Fermeture le lendemain">+1</span>
                          ) : null
                        })()}
                        <button
                          type="button"
                          onClick={() => applyHoursToAll(d.key)}
                          title="Appliquer à tous les jours"
                          className="text-zinc-600 hover:text-orange-400 transition-colors shrink-0 text-xs"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" /></svg>
                        </button>
                      </div>
                    )}
                  </div>
                  {!h.closed && (
                    <TimeBar open={h.open} close={h.close} />
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-[10px] text-zinc-600 mt-2 text-center">Cliquez sur le jour pour ouvrir/fermer · Icône copie = appliquer à tous</p>
        </div>
      )}

      {/* ── Step: Happy Hour ───────────────────────────────────── */}
      {step === 'happyhour' && (
        <div>
          {/* Toggle principal */}
          <button
            type="button"
            onClick={() => setData(p => ({ ...p, happyHour: { ...p.happyHour, enabled: !p.happyHour.enabled } }))}
            className={`w-full flex items-center justify-between gap-4 p-5 rounded-2xl border-2 mb-5 transition-all ${
              data.happyHour.enabled ? 'border-orange-500 bg-orange-500/8' : 'border-zinc-700 bg-zinc-800/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">🍻</span>
              <div className="text-left">
                <p className="font-semibold text-white">Happy Hour</p>
                <p className="text-xs text-zinc-500 mt-0.5">Prix réduits sur certains articles</p>
              </div>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${data.happyHour.enabled ? 'bg-orange-500' : 'bg-zinc-700'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${data.happyHour.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </div>
          </button>

          {data.happyHour.enabled && (
            <div className="space-y-5">
              {/* Jours */}
              <div>
                <p className="text-xs font-medium text-zinc-400 mb-3">Jours actifs</p>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map(d => {
                    const active = data.happyHour.days.includes(d.key)
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => {
                          const next = active
                            ? data.happyHour.days.filter(x => x !== d.key)
                            : [...data.happyHour.days, d.key]
                          if (next.length) setData(p => ({ ...p, happyHour: { ...p.happyHour, days: next } }))
                        }}
                        className={`w-11 h-11 rounded-2xl text-sm font-bold transition-all ${
                          active ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                        }`}
                      >
                        {d.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Plage horaire */}
              <div>
                <p className="text-xs font-medium text-zinc-400 mb-3">Plage horaire</p>
                <div className="bg-zinc-800/60 rounded-2xl p-4">
                  <div className="flex items-center justify-center gap-4 mb-3">
                    <div className="text-center">
                      <p className="text-[10px] text-zinc-500 mb-1">Début</p>
                      <input
                        type="time"
                        value={data.happyHour.start}
                        onChange={e => setData(p => ({ ...p, happyHour: { ...p.happyHour, start: e.target.value } }))}
                        className={TIME_INPUT + ' text-base font-bold'}
                      />
                    </div>
                    <div className="text-zinc-600 font-bold text-lg mt-3">→</div>
                    <div className="text-center">
                      <p className="text-[10px] text-zinc-500 mb-1">Fin</p>
                      <input
                        type="time"
                        value={data.happyHour.end}
                        onChange={e => setData(p => ({ ...p, happyHour: { ...p.happyHour, end: e.target.value } }))}
                        className={TIME_INPUT + ' text-base font-bold'}
                      />
                    </div>
                  </div>
                  <div className="px-1">
                    <div className="flex justify-between text-[10px] text-zinc-600 mb-0.5">
                      <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span>
                    </div>
                    <TimeBar open={data.happyHour.start} close={data.happyHour.end} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {!data.happyHour.enabled && (
            <p className="text-center text-sm text-zinc-500">Activez le happy hour pour définir des prix réduits sur vos articles pendant une plage horaire.</p>
          )}
        </div>
      )}

      {/* ── Navigation ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mt-8">
        {stepIdx > 0 && (
          <button
            type="button"
            onClick={goPrev}
            className="w-12 h-12 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={goNext}
          disabled={isPending || (step === 'info' && !data.name.trim())}
          className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2"
        >
          {isPending && (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {step === 'happyhour' ? (isPending ? 'Création…' : 'Créer mon restaurant →') : 'Continuer →'}
        </button>
      </div>
    </div>
  )
}
