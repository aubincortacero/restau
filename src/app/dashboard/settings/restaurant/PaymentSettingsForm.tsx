'use client'

import { useState } from 'react'
import { updatePaymentMethods, updateFulfillmentModes } from '@/app/actions/restaurant'

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
  saved,
}: {
  restaurantId: string
  initial: string[]
  saved: boolean
}) {
  const [methods, setMethods] = useState<string[]>(initial)

  function toggle(val: string) {
    const next = methods.includes(val) ? methods.filter(x => x !== val) : [...methods, val]
    if (next.length) setMethods(next)
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-sm font-semibold text-white mb-1">Méthodes de paiement acceptées</h2>
      <p className="text-xs text-zinc-500 mb-5">Choisissez comment vos clients peuvent régler leur commande.</p>
      <form action={updatePaymentMethods} className="space-y-3">
        <input type="hidden" name="id" value={restaurantId} />
        <input type="hidden" name="online" value={methods.includes('online') ? '1' : '0'} />
        <input type="hidden" name="cash" value={methods.includes('cash') ? '1' : '0'} />
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
        <div className="pt-1 flex items-center gap-3">
          <button type="submit" className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer">
            Enregistrer
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
              Enregistré
            </span>
          )}
        </div>
      </form>
    </div>
  )
}

export function FulfillmentModesForm({
  restaurantId,
  initial,
  saved,
}: {
  restaurantId: string
  initial: string[]
  saved: boolean
}) {
  const [modes, setModes] = useState<string[]>(initial)

  function toggle(val: string) {
    const next = modes.includes(val) ? modes.filter(x => x !== val) : [...modes, val]
    if (next.length) setModes(next)
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-sm font-semibold text-white mb-1">Modes de service</h2>
      <p className="text-xs text-zinc-500 mb-5">Comment vos clients récupèrent leur commande.</p>
      <form action={updateFulfillmentModes} className="space-y-3">
        <input type="hidden" name="id" value={restaurantId} />
        <input type="hidden" name="table" value={modes.includes('table') ? '1' : '0'} />
        <input type="hidden" name="pickup" value={modes.includes('pickup') ? '1' : '0'} />
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
        <div className="pt-1 flex items-center gap-3">
          <button type="submit" className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer">
            Enregistrer
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
              Enregistré
            </span>
          )}
        </div>
      </form>
    </div>
  )
}

export function PaymentAndServiceForm({
  restaurantId,
  initialPayment,
  initialFulfillment,
  saved,
}: {
  restaurantId: string
  initialPayment: string[]
  initialFulfillment: string[]
  saved: { payment: boolean; fulfillment: boolean }
}) {
  const [methods, setMethods] = useState<string[]>(initialPayment)
  const [modes, setModes] = useState<string[]>(initialFulfillment)

  function toggleMethod(val: string) {
    const next = methods.includes(val) ? methods.filter(x => x !== val) : [...methods, val]
    if (next.length) setMethods(next)
  }
  function toggleMode(val: string) {
    const next = modes.includes(val) ? modes.filter(x => x !== val) : [...modes, val]
    if (next.length) setModes(next)
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
      {/* Méthodes de paiement */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-1">Méthodes de paiement</h2>
        <p className="text-xs text-zinc-500 mb-4">Comment vos clients règlent leur commande.</p>
        <form action={updatePaymentMethods} className="space-y-3">
          <input type="hidden" name="id" value={restaurantId} />
          <input type="hidden" name="online" value={methods.includes('online') ? '1' : '0'} />
          <input type="hidden" name="cash" value={methods.includes('cash') ? '1' : '0'} />
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
          <div className="pt-1 flex items-center gap-3">
            <button type="submit" className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer">
              Enregistrer
            </button>
            {saved.payment && (
              <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                Enregistré
              </span>
            )}
          </div>
        </form>
      </div>

      <div className="border-t border-zinc-800" />

      {/* Modes de service */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-1">Modes de service</h2>
        <p className="text-xs text-zinc-500 mb-4">Comment vos clients récupèrent leur commande.</p>
        <form action={updateFulfillmentModes} className="space-y-3">
          <input type="hidden" name="id" value={restaurantId} />
          <input type="hidden" name="table" value={modes.includes('table') ? '1' : '0'} />
          <input type="hidden" name="pickup" value={modes.includes('pickup') ? '1' : '0'} />
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
          <div className="pt-1 flex items-center gap-3">
            <button type="submit" className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer">
              Enregistrer
            </button>
            {saved.fulfillment && (
              <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                Enregistré
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
