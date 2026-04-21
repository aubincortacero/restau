'use client'

import { useState, useEffect } from 'react'
import type { SessionWithDetails, SelectedItemForPayment, OrderItemWithPayment } from '@/types/session'
import { formatCurrency } from '@/lib/utils'
import { createPartialPayment } from '@/app/actions/sessions'

type PartialPaymentModalProps = {
  session: SessionWithDetails
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function PartialPaymentModal({
  session,
  isOpen,
  onClose,
  onSuccess,
}: PartialPaymentModalProps) {
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map())
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash'>('online')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Récupérer tous les items non entièrement payés
  const availableItems: OrderItemWithPayment[] = session.orders.flatMap((order) =>
    order.order_items.filter((item) => item.remaining_quantity > 0)
  )

  // Calculer le total
  const totalAmount = availableItems.reduce((sum, item) => {
    const selectedQty = selectedItems.get(item.id) || 0
    return sum + selectedQty * item.unit_price
  }, 0)

  const handleQuantityChange = (itemId: string, quantity: number) => {
    const newMap = new Map(selectedItems)
    if (quantity > 0) {
      newMap.set(itemId, quantity)
    } else {
      newMap.delete(itemId)
    }
    setSelectedItems(newMap)
  }

  const handlePayment = async () => {
    if (totalAmount <= 0) {
      alert('Veuillez sélectionner au moins un article')
      return
    }

    setIsProcessing(true)

    const itemsForPayment: SelectedItemForPayment[] = availableItems
      .filter((item) => (selectedItems.get(item.id) || 0) > 0)
      .map((item) => ({
        order_item_id: item.id,
        item_name: item.item_name,
        quantity: selectedItems.get(item.id)!,
        unit_price: item.unit_price,
        max_quantity: item.remaining_quantity,
      }))

    if (paymentMethod === 'online') {
      // TODO: Intégrer Stripe pour le paiement en ligne
      // Pour l'instant, on simule un paiement réussi
      const result = await createPartialPayment(
        session.id,
        itemsForPayment,
        'online',
        `pi_simulated_${Date.now()}`,
        customerName || undefined,
        customerEmail || undefined
      )

      if (result.success) {
        onSuccess()
        onClose()
      } else {
        alert(`Erreur : ${result.error}`)
      }
    } else {
      // Paiement en espèces (cash)
      const result = await createPartialPayment(
        session.id,
        itemsForPayment,
        'cash',
        undefined,
        customerName || undefined,
        customerEmail || undefined
      )

      if (result.success) {
        onSuccess()
        onClose()
      } else {
        alert(`Erreur : ${result.error}`)
      }
    }

    setIsProcessing(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Paiement partiel</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        {/* Contenu */}
        <div className="p-4 space-y-4">
          {/* Informations client (optionnel) */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300">
              Informations (optionnel)
            </h3>
            <input
              type="text"
              placeholder="Nom du client"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
            />
            <input
              type="email"
              placeholder="Email du client"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
            />
          </div>

          {/* Sélection des articles */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300">
              Articles à payer ({availableItems.length})
            </h3>
            <div className="space-y-3">
              {availableItems.map((item) => {
                const selectedQty = selectedItems.get(item.id) || 0
                const itemTotal = selectedQty * item.unit_price

                return (
                  <div
                    key={item.id}
                    className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{item.item_name}</p>
                        <p className="text-xs text-gray-500">
                          {item.remaining_quantity} restant{item.remaining_quantity > 1 ? 's' : ''} × {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                      {selectedQty > 0 && (
                        <p className="font-semibold text-sm text-blue-600 dark:text-blue-400">
                          {formatCurrency(itemTotal)}
                        </p>
                      )}
                    </div>

                    {/* Slider de quantité */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Quantité à payer</span>
                        <span>{selectedQty} / {item.remaining_quantity}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={item.remaining_quantity}
                        value={selectedQty}
                        onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex gap-2">
                        {[...Array(Math.min(item.remaining_quantity, 5))].map((_, i) => {
                          const qty = i + 1
                          return (
                            <button
                              key={qty}
                              onClick={() => handleQuantityChange(item.id, qty)}
                              className={`px-2 py-1 text-xs rounded ${
                                selectedQty === qty
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                              }`}
                            >
                              {qty}
                            </button>
                          )
                        })}
                        {item.remaining_quantity > 5 && (
                          <button
                            onClick={() => handleQuantityChange(item.id, item.remaining_quantity)}
                            className={`px-2 py-1 text-xs rounded ${
                              selectedQty === item.remaining_quantity
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                          >
                            Tout
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Méthode de paiement */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300">
              Méthode de paiement
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaymentMethod('online')}
                className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                  paymentMethod === 'online'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }`}
              >
                <div className="text-2xl mb-1">💳</div>
                <div className="text-sm font-medium">Carte bancaire</div>
              </button>
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                  paymentMethod === 'cash'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }`}
              >
                <div className="text-2xl mb-1">💵</div>
                <div className="text-sm font-medium">Espèces</div>
              </button>
            </div>
          </div>
        </div>

        {/* Pied de page avec total et bouton */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-lg">Total à payer</span>
            <span className="font-bold text-2xl text-blue-600 dark:text-blue-400">
              {formatCurrency(totalAmount)}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handlePayment}
              disabled={totalAmount <= 0 || isProcessing}
              className={`flex-1 px-4 py-3 rounded-lg transition-colors ${
                totalAmount > 0 && !isProcessing
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isProcessing ? 'Traitement...' : 'Payer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
