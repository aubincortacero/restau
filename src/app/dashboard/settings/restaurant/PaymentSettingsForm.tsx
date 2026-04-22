'use client'

import { useState, useTransition } from 'react'
import { updatePaymentMethods, updateFulfillmentModes, updateArdoiseEnabled } from '@/app/actions/restaurant'

type SaveStatus = 'idle' | 'saving' | 'saved'

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'saving') return (
    <span className="flex items-center gap-1.5 text-zinc-400 text-xs">
      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      Enregistrement…
    </span>
  )
  if (status === 'saved') return (
    <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
      Enregistré
    </span>
  )
  return null
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

export function PaymentMethodsForm({
  restaurantId,
  initial,
}: {
  restaurantId: string
  initial: string[]
  saved?: boolean
}) {
  const [methods, setMethods] = useState<string[]>(initial)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [, startTransition] = useTransition()

  function toggle(val: string) {
    const next = methods.includes(val) ? methods.filter(x => x !== val) : [...methods, val]
    if (!next.length) return
    setMethods(next)
    const fd = new FormData()
    fd.append('id', restaurantId)
    fd.append('online', next.includes('online') ? '1' : '0')
    fd.append('cash', next.includes('cash') ? '1' : '0')
    setStatus('saving')
    startTransition(async () => {
      await updatePaymentMethods(fd)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    })
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-white">Méthodes de paiement acceptées</h2>
        <SaveIndicator status={status} />
      </div>
      <p className="text-xs text-zinc-500 mb-5">Choisissez comment vos clients peuvent régler leur commande.</p>
      <div className="space-y-3">
        <ToggleCard
          selected={methods.includes('online')}
          onClick={() => toggle('online')}
          title="Paiement en ligne"
          sub="Le client paie par carte depuis son téléphone"
          icon={<svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg>}
        />
        <ToggleCard
          selected={methods.includes('cash')}
          onClick={() => toggle('cash')}
          title="Paiement à la caisse"
          sub="Le client règle en espèces ou carte à la fin"
          icon={<svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>}
        />
      </div>
    </div>
  )
}

export function FulfillmentModesForm({
  restaurantId,
  initial,
}: {
  restaurantId: string
  initial: string[]
  saved?: boolean
}) {
  const [modes, setModes] = useState<string[]>(initial)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [, startTransition] = useTransition()

  function toggle(val: string) {
    const next = modes.includes(val) ? modes.filter(x => x !== val) : [...modes, val]
    if (!next.length) return
    setModes(next)
    const fd = new FormData()
    fd.append('id', restaurantId)
    fd.append('table', next.includes('table') ? '1' : '0')
    fd.append('pickup', next.includes('pickup') ? '1' : '0')
    setStatus('saving')
    startTransition(async () => {
      await updateFulfillmentModes(fd)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    })
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-white">Modes de service</h2>
        <SaveIndicator status={status} />
      </div>
      <p className="text-xs text-zinc-500 mb-5">Comment vos clients récupèrent leur commande.</p>
      <div className="space-y-3">
        <ToggleCard
          selected={modes.includes('table')}
          onClick={() => toggle('table')}
          title="Livré à la table"
          sub="Le serveur apporte la commande à la table"
          icon={<span className="text-2xl">🍽️</span>}
        />
        <ToggleCard
          selected={modes.includes('pickup')}
          onClick={() => toggle('pickup')}
          title="Retrait au comptoir"
          sub="Le client récupère sa commande avec un code"
          icon={<span className="text-2xl">🛍️</span>}
        />
      </div>
    </div>
  )
}

export function PaymentAndServiceForm({
  restaurantId,
  initialPayment,
  initialFulfillment,
}: {
  restaurantId: string
  initialPayment: string[]
  initialFulfillment: string[]
  saved?: { payment: boolean; fulfillment: boolean }
}) {
  const [methods, setMethods] = useState<string[]>(initialPayment)
  const [modes, setModes] = useState<string[]>(initialFulfillment)
  const [payStatus, setPayStatus] = useState<SaveStatus>('idle')
  const [fulfillStatus, setFulfillStatus] = useState<SaveStatus>('idle')
  const [, startTransition] = useTransition()

  function toggleMethod(val: string) {
    const next = methods.includes(val) ? methods.filter(x => x !== val) : [...methods, val]
    if (!next.length) return
    setMethods(next)
    const fd = new FormData()
    fd.append('id', restaurantId)
    fd.append('online', next.includes('online') ? '1' : '0')
    fd.append('cash', next.includes('cash') ? '1' : '0')
    setPayStatus('saving')
    startTransition(async () => {
      await updatePaymentMethods(fd)
      setPayStatus('saved')
      setTimeout(() => setPayStatus('idle'), 2000)
    })
  }

  function toggleMode(val: string) {
    const next = modes.includes(val) ? modes.filter(x => x !== val) : [...modes, val]
    if (!next.length) return
    setModes(next)
    const fd = new FormData()
    fd.append('id', restaurantId)
    fd.append('table', next.includes('table') ? '1' : '0')
    fd.append('pickup', next.includes('pickup') ? '1' : '0')
    setFulfillStatus('saving')
    startTransition(async () => {
      await updateFulfillmentModes(fd)
      setFulfillStatus('saved')
      setTimeout(() => setFulfillStatus('idle'), 2000)
    })
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
      {/* Méthodes de paiement */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-white">Méthodes de paiement</h2>
          <SaveIndicator status={payStatus} />
        </div>
        <p className="text-xs text-zinc-500 mb-4">Comment vos clients règlent leur commande.</p>
        <div className="space-y-3">
          <ToggleCard
            selected={methods.includes('online')}
            onClick={() => toggleMethod('online')}
            title="Paiement en ligne"
            sub="Le client paie par carte depuis son téléphone"
            icon={<svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg>}
          />
          <ToggleCard
            selected={methods.includes('cash')}
            onClick={() => toggleMethod('cash')}
            title="Paiement à la caisse"
            sub="Le client règle en espèces ou carte à la fin"
            icon={<svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>}
          />
        </div>
      </div>

      <div className="border-t border-zinc-800" />

      {/* Modes de service */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-white">Modes de service</h2>
          <SaveIndicator status={fulfillStatus} />
        </div>
        <p className="text-xs text-zinc-500 mb-4">Comment vos clients récupèrent leur commande.</p>
        <div className="space-y-3">
          <ToggleCard
            selected={modes.includes('table')}
            onClick={() => toggleMode('table')}
            title="Livré à la table"
            sub="Le serveur apporte la commande à la table"
            icon={<span className="text-2xl">🍽️</span>}
          />
          <ToggleCard
            selected={modes.includes('pickup')}
            onClick={() => toggleMode('pickup')}
            title="Retrait au comptoir"
            sub="Le client récupère sa commande avec un code"
            icon={<span className="text-2xl">🛍️</span>}
          />
        </div>
      </div>
    </div>
  )
}

export function ArdoiseToggleForm({
  restaurantId,
  initial,
}: {
  restaurantId: string
  initial: boolean
}) {
  const [enabled, setEnabled] = useState(initial)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [, startTransition] = useTransition()

  function toggle() {
    const next = !enabled
    setEnabled(next)
    const fd = new FormData()
    fd.append('id', restaurantId)
    fd.append('enabled', next ? '1' : '0')
    setStatus('saving')
    startTransition(async () => {
      await updateArdoiseEnabled(fd)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    })
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-white">Service Ardoise</h2>
        <SaveIndicator status={status} />
      </div>
      <p className="text-xs text-zinc-500 mb-5">Permettez aux clients de commander plusieurs fois et de payer à la fin.</p>
      <button
        type="button"
        onClick={toggle}
        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
          enabled
            ? 'border-orange-500 bg-orange-500/8'
            : 'border-zinc-700 bg-zinc-800/40 hover:border-zinc-600'
        }`}
      >
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${enabled ? 'bg-orange-500/20' : 'bg-zinc-700'}`}>
          <svg className={`w-5 h-5 ${enabled ? 'text-orange-400' : 'text-zinc-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${enabled ? 'text-white' : 'text-zinc-300'}`}>
            {enabled ? 'Ardoise activée' : 'Ardoise désactivée'}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {enabled 
              ? 'Les clients peuvent accumuler plusieurs commandes avant de payer' 
              : 'Les clients doivent payer à chaque commande'}
          </p>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${enabled ? 'border-orange-500 bg-orange-500' : 'border-zinc-600'}`}>
          {enabled && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          )}
        </div>
      </button>
    </div>
  )
}
