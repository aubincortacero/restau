'use client'

import { useState } from 'react'
import { closeTableSession } from '@/app/actions/sessions'
import type { SessionWithDetails } from '@/types/session'

function fmt(p: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(p)
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  return `${Math.floor(diff / 3600)}h`
}

export function ActiveTabCard({ session }: { session: SessionWithDetails }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  const { balance, orders, table } = session
  const orderCount = orders.length
  const itemCount = orders.reduce((sum, o) => sum + o.order_items.reduce((s, i) => s + i.quantity, 0), 0)

  async function handleClose() {
    if (!confirm('Fermer cette ardoise ? Les clients ne pourront plus y ajouter de commandes.')) return
    setIsClosing(true)
    await closeTableSession(session.id)
    setIsClosing(false)
  }

  return (
    <div className="bg-gradient-to-br from-purple-950/40 to-purple-900/20 border-2 border-purple-500/30 rounded-2xl overflow-hidden shadow-lg shadow-purple-950/40">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-4 p-5 hover:bg-purple-900/10 transition-colors text-left"
      >
        <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-2xl shrink-0">
          📋
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-lg text-purple-100">
              Table {table.number}{table.label ? ` — ${table.label}` : ''}
            </h3>
            <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-full">
              Ardoise
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-purple-300">
              {orderCount} commande{orderCount > 1 ? 's' : ''} · {itemCount} article{itemCount > 1 ? 's' : ''}
            </span>
            <span className="text-purple-500">·</span>
            <span className="text-purple-400">
              Ouverte il y a {timeAgo(session.started_at)}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-black text-purple-200">
            {fmt(balance.total_amount)}
          </p>
          {balance.paid_amount > 0 && (
            <p className="text-sm text-purple-400">
              {fmt(balance.paid_amount)} payé
            </p>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-purple-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-purple-500/20 bg-black/20">
          {/* Liste des commandes */}
          <div className="p-5 space-y-3">
            <p className="text-sm font-semibold text-purple-300 uppercase tracking-wide">
              Commandes de cette ardoise
            </p>
            {orders.map((order, idx) => (
              <div
                key={order.id}
                className="bg-purple-950/30 border border-purple-500/20 rounded-xl p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="text-sm text-purple-400">
                      {timeAgo(order.created_at)}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-purple-200">
                    {fmt(order.order_items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0))}
                  </span>
                </div>
                <div className="space-y-1">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-purple-200">
                        <span className="text-purple-400 font-semibold">{item.quantity}×</span> {item.item_name}
                      </span>
                      <span className="text-purple-300">{fmt(item.unit_price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                {order.customer_note && (
                  <p className="text-xs text-purple-400 mt-2 italic">
                    💬 {order.customer_note}
                  </p>
                )}
              </div>
            ))}

            {/* Balance */}
            <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border-2 border-purple-400/40 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-purple-300">Total</span>
                <span className="text-xl font-black text-purple-100">{fmt(balance.total_amount)}</span>
              </div>
              {balance.paid_amount > 0 && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-purple-400">Déjà payé</span>
                    <span className="text-sm font-semibold text-emerald-400">
                      - {fmt(balance.paid_amount)}
                    </span>
                  </div>
                  <div className="border-t border-purple-400/30 pt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-purple-200">Reste à payer</span>
                    <span className="text-lg font-black text-purple-100">
                      {fmt(balance.remaining_amount)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-2">
              <button
                onClick={handleClose}
                disabled={isClosing || balance.remaining_amount > 0}
                className="flex-1 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClosing ? 'Fermeture...' : balance.remaining_amount > 0 ? 'Encaisser d\'abord' : 'Fermer l\'ardoise'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
