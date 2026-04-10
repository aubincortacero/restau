'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import OrderTimer from './OrderTimer'

export type ChecklistItem = {
  id: string
  label: string
  done: boolean
  href: string
}

type PendingOrder = {
  id: string
  created_at: string
  table_number: number | null
  table_label: string | null
  total: number
}

export default function PendingOrdersSidebar({ restaurantId, checklistItems }: { restaurantId: string; checklistItems?: ChecklistItem[] }) {
  const [orders, setOrders] = useState<PendingOrder[]>([])
  const pathname = usePathname()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchOrders() {
    try {
      const res = await fetch(`/api/orders/pending?restaurantId=${restaurantId}&detail=1`)
      if (!res.ok) return
      const data = await res.json()
      setOrders(data.orders ?? [])
    } catch {
      // silently ignore
    }
  }

  useEffect(() => {
    fetchOrders()
    intervalRef.current = setInterval(fetchOrders, 8000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId])

  useEffect(() => {
    fetchOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <aside className="hidden xl:flex flex-col w-64 shrink-0 border-l border-zinc-800 bg-zinc-900/30 sticky top-0 h-dvh">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-zinc-800 shrink-0 flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          En attente
        </h2>
        {orders.length > 0 && (
          <span className="min-w-[20px] h-5 px-1 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
            {orders.length > 9 ? '9+' : orders.length}
          </span>
        )}
      </div>

      {/* Liste scrollable */}
      <div className="flex-1 overflow-y-auto">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-4 pb-8 text-center">
            <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center mb-1">
              <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-zinc-500">Rien de nouveau ici</p>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Les commandes en attente<br />apparaîtront ici en temps réel
            </p>
          </div>
        ) : (
          <div className="py-2">
            {orders.map((order, index) => (
              <Link
                key={order.id}
                href="/dashboard/orders"
                className="flex items-center gap-3 px-3 py-3 mx-2 rounded-xl hover:bg-zinc-800/60 transition-colors group"
              >
                {/* Numéro de table */}
                <div className={`text-3xl font-black tabular-nums leading-none shrink-0 w-10 text-center ${index === 0 ? 'text-orange-400' : 'text-zinc-400'}`}>
                  {order.table_number ?? '?'}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  {order.table_label && (
                    <p className="text-xs font-medium text-zinc-300 truncate leading-tight mb-0.5">
                      {order.table_label}
                    </p>
                  )}
                  <OrderTimer createdAt={order.created_at} thresholdMinutes={5} />
                </div>

                {/* Montant + flèche */}
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-white tabular-nums">
                    {order.total.toFixed(2)} €
                  </p>
                  <svg className="w-3 h-3 text-zinc-700 group-hover:text-zinc-400 ml-auto mt-0.5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Checklist guide de démarrage */}
      {checklistItems && checklistItems.some((i) => !i.done) && (
        <ChecklistSection items={checklistItems} />
      )}

      {/* Footer */}
      {orders.length > 0 && (
        <div className="px-4 py-3 border-t border-zinc-800 shrink-0">
          <Link
            href="/dashboard/orders"
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
          >
            Voir toutes les commandes
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>
      )}
    </aside>
  )
}

function ChecklistSection({ items }: { items: ChecklistItem[] }) {
  const [open, setOpen] = useState(true)
  const doneCount = items.filter((i) => i.done).length

  return (
    <div className="border-t border-zinc-800 shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-zinc-800/40 transition-colors"
      >
        <svg className="w-4 h-4 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Guide de démarrage</p>
          <p className="text-xs text-zinc-400">{doneCount}/{items.length} étapes</p>
        </div>
        <svg
          className={`w-3.5 h-3.5 text-zinc-600 transition-transform shrink-0 ${open ? '' : '-rotate-180'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
        </svg>
      </button>

      {/* Barre de progression */}
      <div className="px-4 pb-2">
        <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-500"
            style={{ width: `${(doneCount / items.length) * 100}%` }}
          />
        </div>
      </div>

      {open && (
        <ul className="px-3 pb-3 space-y-0.5">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className={`flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-colors ${
                  item.done ? 'text-zinc-600' : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                {item.done ? (
                  <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-zinc-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                )}
                <span className={item.done ? 'line-through' : ''}>{item.label}</span>
                {!item.done && (
                  <svg className="w-3 h-3 text-zinc-700 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                  </svg>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
