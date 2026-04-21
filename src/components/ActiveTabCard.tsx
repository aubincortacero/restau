'use client'

import { useState } from 'react'
import { closeTableSession, markOrderDelivered } from '@/app/actions/sessions'
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
  const [deliveredOrders, setDeliveredOrders] = useState<Set<string>>(
    new Set(session.orders.filter(o => o.status === 'ready').map(o => o.id))
  )

  const { balance, orders, table } = session
  const orderCount = orders.length
  const itemCount = orders.reduce((sum, o) => sum + o.order_items.reduce((s, i) => s + i.quantity, 0), 0)

  async function handleClose() {
    if (!confirm('Fermer cette ardoise ? Les clients ne pourront plus y ajouter de commandes.')) return
    setIsClosing(true)
    await closeTableSession(session.id)
    setIsClosing(false)
  }

  async function handleMarkDelivered(orderId: string) {
    console.log('[ActiveTabCard] Marking order as delivered:', orderId)
    
    // Optimistic update
    setDeliveredOrders(prev => new Set([...prev, orderId]))
    
    try {
      const result = await markOrderDelivered(orderId)
      console.log('[ActiveTabCard] markOrderDelivered result:', result)
      
      if (!result.success) {
        // Rollback si erreur
        setDeliveredOrders(prev => {
          const newSet = new Set(prev)
          newSet.delete(orderId)
          return newSet
        })
        console.error('[ActiveTabCard] Error from server:', result.error)
        alert(`Erreur lors de la mise à jour: ${result.error || 'erreur inconnue'}`)
      }
    } catch (error) {
      console.error('[ActiveTabCard] Exception during markOrderDelivered:', error)
      // Rollback si exception
      setDeliveredOrders(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
      alert('Erreur lors de la mise à jour')
    }
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
            {orders.map((order, idx) => {
              const isDelivered = deliveredOrders.has(order.id)
              
              return (
                <div
                  key={order.id}
                  className={`rounded-xl p-4 shadow-lg transition-all ${
                    isDelivered
                      ? 'bg-zinc-900/40 border border-zinc-700/50 opacity-60'
                      : 'bg-gradient-to-br from-orange-950/60 to-orange-900/40 border-2 border-orange-500/50 shadow-orange-950/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center border ${
                        isDelivered
                          ? 'bg-zinc-700/30 text-zinc-500 border-zinc-600/40'
                          : 'bg-orange-500/30 text-orange-200 border-orange-400/40'
                      }`}>
                        #{idx + 1}
                      </span>
                      <span className={`text-sm font-medium ${isDelivered ? 'text-zinc-500' : 'text-orange-300'}`}>
                        {timeAgo(order.created_at)}
                      </span>
                      {isDelivered && (
                        <span className="text-xs bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          ✓ Servie
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-base font-bold ${isDelivered ? 'text-zinc-500' : 'text-orange-100'}`}>
                        {fmt(order.order_items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0))}
                      </span>
                      {!isDelivered && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkDelivered(order.id)
                          }}
                          className="ml-2 px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                          title="Marquer comme servie"
                        >
                          Servie
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className={`font-medium ${isDelivered ? 'text-zinc-500' : 'text-white'}`}>
                          <span className={`font-bold ${isDelivered ? 'text-zinc-600' : 'text-orange-400'}`}>{item.quantity}×</span> {item.item_name}
                        </span>
                        <span className={`font-semibold ${isDelivered ? 'text-zinc-600' : 'text-orange-200'}`}>
                          {fmt(item.unit_price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {order.customer_note && (
                    <p className={`text-xs mt-2 italic px-2 py-1 rounded ${
                      isDelivered
                        ? 'text-zinc-600 bg-zinc-800/40'
                        : 'text-orange-300 bg-orange-950/40'
                    }`}>
                      💬 {order.customer_note}
                    </p>
                  )}
                </div>
              )
            })}

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
