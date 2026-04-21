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
  const [showPaymentHistory, setShowPaymentHistory] = useState(false)

  const { balance } = session
  const isFullyPaid = balance.is_fully_paid

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      {/* En-tête de session */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg">Table {session.table.number}</h3>
          {session.table.label && (
            <p className="text-sm text-gray-500">{session.table.label}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Session en cours</p>
          <p className="text-xs text-gray-400">
            Depuis {new Date(session.started_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Balance financière */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
          <span className="font-semibold">{formatCurrency(balance.total_amount)}</span>
        </div>
        {balance.paid_amount > 0 && (
          <div className="flex justify-between text-green-600 dark:text-green-400">
            <span className="text-sm">Déjà payé</span>
            <span className="font-medium">-{formatCurrency(balance.paid_amount)}</span>
          </div>
        )}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between">
          <span className="font-semibold">Reste à payer</span>
          <span className={`font-bold text-lg ${isFullyPaid ? 'text-green-600' : ''}`}>
            {formatCurrency(balance.remaining_amount)}
          </span>
        </div>
      </div>

      {/* Historique des commandes */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
          Commandes ({session.orders.length})
        </h4>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {session.orders.map((order) => (
            <div
              key={order.id}
              className="bg-gray-50 dark:bg-gray-900 rounded p-3 text-sm space-y-1"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-500">
                  {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {order.status}
                </span>
              </div>
              {order.order_items.map((item) => (
                <div key={item.id} className="flex justify-between text-xs">
                  <span>
                    {item.item_name} × {item.quantity}
                    {item.paid_quantity > 0 && (
                      <span className="text-green-600 ml-1">
                        ({item.paid_quantity} payé{item.paid_quantity > 1 ? 's' : ''})
                      </span>
                    )}
                  </span>
                  <span>{formatCurrency(item.quantity * item.unit_price)}</span>
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
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showPaymentHistory ? 'Masquer' : 'Voir'} l&apos;historique des paiements ({session.partial_payments.length})
          </button>
          {showPaymentHistory && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {session.partial_payments.map((payment) => (
                <div
                  key={payment.id}
                  className="bg-green-50 dark:bg-green-900/20 rounded p-3 text-sm border border-green-200 dark:border-green-800"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{formatCurrency(payment.amount)}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        {payment.payment_method === 'online' ? '💳 En ligne' : '💵 Espèces'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(payment.created_at).toLocaleString('fr-FR', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  {payment.customer_name && (
                    <p className="text-xs text-gray-600 mt-1">{payment.customer_name}</p>
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
  )
}
