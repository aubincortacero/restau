'use client'

import { useState } from 'react'
import type { SessionWithDetails } from '@/types/session'
import { formatCurrency } from '@/lib/utils'

type SessionStatusCardProps = {
  session: SessionWithDetails
  onPayPartial: () => void
  onPayAll: () => void
  onOrderMore: () => void
}

export function SessionStatusCard({
  session,
  onPayPartial,
  onPayAll,
  onOrderMore,
}: SessionStatusCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showPaymentHistory, setShowPaymentHistory] = useState(false)

  const { balance } = session
  const isFullyPaid = balance.is_fully_paid

  const getStatusLabel = (status: string) => {
    if (status === 'delivered') return 'Servie'
    if (status === 'pending') return 'En attente'
    return status
  }

  const getStatusColor = (status: string) => {
    if (status === 'delivered') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  }

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-xl">
      {/* Header compact - toujours visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-lg shrink-0">
            🧾
          </div>
          <div className="text-left">
            <h3 className="font-bold text-white">Table {session.table.number}{session.table.label ? ` — ${session.table.label}` : ''}</h3>
            <p className="text-xs text-zinc-400">
              {session.orders.length} commande{session.orders.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-bold text-lg text-white">{formatCurrency(balance.remaining_amount)}</p>
            <p className="text-xs text-zinc-500">à payer</p>
          </div>
          <svg
            className={`w-5 h-5 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {/* Contenu détaillé - visible seulement quand expanded */}
      {isExpanded && (
        <div className="border-t border-zinc-800 p-4 space-y-4 bg-black/20">
          {/* Balance financière */}
          <div className="bg-zinc-900/60 rounded-xl p-4 space-y-2 border border-zinc-800">
            <div className="flex justify-between">
              <span className="text-sm text-zinc-400">Total</span>
              <span className="font-semibold text-white">{formatCurrency(balance.total_amount)}</span>
            </div>
            {balance.paid_amount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span className="text-sm">Déjà payé</span>
                <span className="font-medium">-{formatCurrency(balance.paid_amount)}</span>
              </div>
            )}
            <div className="border-t border-zinc-700 pt-2 flex justify-between">
              <span className="font-semibold text-white">Reste à payer</span>
              <span className={`font-bold text-lg ${isFullyPaid ? 'text-emerald-400' : 'text-orange-400'}`}>
                {formatCurrency(balance.remaining_amount)}
              </span>
            </div>
          </div>

          {/* Historique des commandes */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-zinc-300 uppercase tracking-wide">
              Commandes ({session.orders.length})
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {session.orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-sm space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">
                      {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex justify-between text-xs">
                      <span className="text-zinc-300">
                        <span className="text-orange-400 font-bold">{item.quantity}×</span> {item.item_name}
                        {item.paid_quantity > 0 && (
                          <span className="text-emerald-400 ml-1">
                            ({item.paid_quantity} payé{item.paid_quantity > 1 ? 's' : ''})
                          </span>
                        )}
                      </span>
                      <span className="text-white font-medium">{formatCurrency(item.quantity * item.unit_price)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Historique des paiements */}
          {session.partial_payments.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => setShowPaymentHistory(!showPaymentHistory)}
                className="text-sm font-medium text-orange-400 hover:text-orange-300 transition-colors"
              >
                {showPaymentHistory ? 'Masquer' : 'Voir'} l&apos;historique des paiements ({session.partial_payments.length})
              </button>
              {showPaymentHistory && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {session.partial_payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="bg-emerald-900/20 rounded-xl p-3 text-sm border border-emerald-500/30"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium text-emerald-400">{formatCurrency(payment.amount)}</span>
                          <span className="text-xs text-zinc-400 ml-2">
                            {payment.payment_method === 'online' ? '💳 En ligne' : '💵 Espèces'}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-500">
                          {new Date(payment.created_at).toLocaleString('fr-FR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      {payment.customer_name && (
                        <p className="text-xs text-zinc-400 mt-1">{payment.customer_name}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {!isFullyPaid && (
              <>
                <button
                  onClick={onPayPartial}
                  className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-xl transition-colors"
                >
                  Payer une partie
                </button>
                <button
                  onClick={onPayAll}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors"
                >
                  Tout payer
                </button>
              </>
            )}
            {isFullyPaid && (
              <div className="flex-1 px-4 py-3 bg-emerald-500/20 text-emerald-400 rounded-xl text-center font-semibold border border-emerald-500/30">
                ✓ Tout payé
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
