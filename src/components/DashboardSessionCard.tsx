'use client'

import { useState } from 'react'
import type { SessionWithDetails } from '@/types/session'
import { formatCurrency } from '@/lib/utils'
import { closeTableSession, recordCashPayment } from '@/app/actions/sessions'
import { useRouter } from 'next/navigation'

type DashboardSessionCardProps = {
  session: SessionWithDetails
}

export function DashboardSessionCard({ session }: DashboardSessionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showCashModal, setShowCashModal] = useState(false)
  const [cashAmount, setCashAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()

  const { balance } = session
  const isFullyPaid = balance.is_fully_paid

  const handleClose = async () => {
    if (!confirm('Fermer cette session ? Les clients ne pourront plus commander.')) return
    
    setIsProcessing(true)
    const result = await closeTableSession(session.id)
    if (result.success) {
      router.refresh()
    } else {
      alert(`Erreur : ${result.error}`)
    }
    setIsProcessing(false)
  }

  const handleCashPayment = async () => {
    const amount = parseFloat(cashAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Montant invalide')
      return
    }

    setIsProcessing(true)
    const result = await recordCashPayment(session.id, amount)
    if (result.success) {
      setCashAmount('')
      setShowCashModal(false)
      router.refresh()
    } else {
      alert(`Erreur : ${result.error}`)
    }
    setIsProcessing(false)
  }

  return (
    <>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {/* En-tête */}
        <div
          className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {/* Numéro de table */}
          <div className="text-4xl font-black tabular-nums leading-none shrink-0 text-blue-400">
            {session.table.number}
          </div>

          {/* Infos centrales */}
          <div className="flex-1 min-w-0">
            {session.table.label && (
              <p className="text-base font-semibold leading-tight truncate text-white">
                {session.table.label}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <span className="text-xs text-zinc-500">
                Session active depuis {new Date(session.started_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isFullyPaid ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
              }`}>
                {isFullyPaid ? 'Tout payé' : 'Paiement en cours'}
              </span>
            </div>
            <div className="text-xs text-zinc-600 mt-1">
              {session.orders.length} commande{session.orders.length > 1 ? 's' : ''} · {session.partial_payments.length} paiement{session.partial_payments.length > 1 ? 's' : ''}
            </div>
          </div>

          {/* Montant restant */}
          <div className="text-right shrink-0">
            <p className="text-xs text-zinc-500">Reste à payer</p>
            <p className={`text-2xl font-bold tabular-nums ${isFullyPaid ? 'text-green-400' : 'text-yellow-400'}`}>
              {formatCurrency(balance.remaining_amount)}
            </p>
            <p className="text-xs text-zinc-600">sur {formatCurrency(balance.total_amount)}</p>
          </div>

          {/* Icône expand */}
          <svg
            className={`w-5 h-5 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
          </svg>
        </div>

        {/* Détails expandables */}
        {isExpanded && (
          <div className="px-5 pb-4 space-y-4 border-t border-zinc-800">
            {/* Commandes */}
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-zinc-400 mb-2">Commandes</h4>
              <div className="space-y-2">
                {session.orders.map((order) => (
                  <div key={order.id} className="bg-zinc-800/60 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-zinc-500">
                        {new Date(order.created_at).toLocaleString('fr-FR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex justify-between text-xs text-zinc-300">
                        <span>
                          {item.item_name} × {item.quantity}
                          {item.paid_quantity > 0 && (
                            <span className="text-green-400 ml-1">
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

            {/* Paiements */}
            {session.partial_payments.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-zinc-400 mb-2">Historique des paiements</h4>
                <div className="space-y-2">
                  {session.partial_payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="bg-green-900/20 border border-green-800/50 rounded-lg p-3 text-sm"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium text-green-400">{formatCurrency(payment.amount)}</span>
                          <span className="text-xs text-zinc-500 ml-2">
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
                        <p className="text-xs text-zinc-600 mt-1">{payment.customer_name}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {!isFullyPaid && (
                <button
                  onClick={() => setShowCashModal(true)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  💵 Encaisser
                </button>
              )}
              <button
                onClick={handleClose}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/50 rounded-lg hover:bg-red-600/30 transition-colors text-sm font-medium disabled:opacity-50"
              >
                Fermer la session
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal paiement cash */}
      {showCashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-zinc-900 rounded-lg shadow-xl max-w-md w-full p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold mb-4">Encaisser un paiement</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Montant (max: {formatCurrency(balance.remaining_amount)})
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={balance.remaining_amount}
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  />
                  <span className="flex items-center text-zinc-400">€</span>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setCashAmount((balance.remaining_amount / 2).toFixed(2))}
                    className="px-3 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => setCashAmount(balance.remaining_amount.toFixed(2))}
                    className="px-3 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded"
                  >
                    Tout
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCashModal(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCashPayment}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Traitement...' : 'Encaisser'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
