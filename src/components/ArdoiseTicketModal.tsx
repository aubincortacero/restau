'use client'

import { useState } from 'react'
import type { SessionWithDetails } from '@/types/session'

function fmt(p: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(p)
}

type ArdoiseTicketModalProps = {
  session: SessionWithDetails
  restaurantName: string
}

export function ArdoiseTicketModal({ session, restaurantName }: ArdoiseTicketModalProps) {
  const [showModal, setShowModal] = useState(false)

  const { balance, orders, table } = session
  const tableDisplay = table.label ? `Table ${table.number} — ${table.label}` : `Table ${table.number}`

  async function downloadPDF() {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: [80, 297], orientation: 'portrait' })

    const date = new Date(session.started_at).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Europe/Paris',
    })

    let y = 8
    const lineH = 5
    const w = 72

    // Header
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(restaurantName, w / 2, y, { align: 'center' })
    y += lineH

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('TICKET D\'ARDOISE', w / 2, y, { align: 'center' })
    y += lineH

    doc.setLineDashPattern([1, 1], 0)
    doc.line(4, y, w - 2, y)
    y += 4

    doc.setFontSize(8)
    doc.text(`Ouverture : ${date}`, 4, y); y += lineH
    doc.text(tableDisplay, 4, y); y += lineH

    doc.line(4, y, w - 2, y)
    y += 4

    // Commandes
    for (let idx = 0; idx < orders.length; idx++) {
      const order = orders[idx]
      
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text(`Commande #${idx + 1}`, 4, y)
      y += lineH
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      
      for (const item of order.order_items) {
        const total = (item.quantity * item.unit_price).toFixed(2) + ' EUR'
        const label = `${item.quantity}x ${item.item_name}${item.size_label ? ' ' + item.size_label : ''}`
        const lines = doc.splitTextToSize(label, w - 20) as string[]
        doc.text(lines, 4, y)
        doc.text(total, w - 2, y, { align: 'right' })
        y += lines.length * lineH
      }
      
      if (order.customer_note) {
        doc.setFontSize(7)
        doc.setTextColor(120, 120, 120)
        doc.text(`  Note: ${order.customer_note}`, 4, y)
        doc.setFontSize(8)
        doc.setTextColor(0, 0, 0)
        y += lineH
      }
      
      y += 2
    }

    doc.line(4, y, w - 2, y)
    y += 4

    // Totaux
    const ht = balance.total_amount / 1.1
    const tva = balance.total_amount - ht

    doc.text('Montant HT :', 4, y)
    doc.text(`${ht.toFixed(2)} EUR`, w - 2, y, { align: 'right' })
    y += lineH

    doc.text('TVA 10% :', 4, y)
    doc.text(`${tva.toFixed(2)} EUR`, w - 2, y, { align: 'right' })
    y += lineH

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('TOTAL TTC :', 4, y)
    doc.text(`${balance.total_amount.toFixed(2)} EUR`, w - 2, y, { align: 'right' })
    y += lineH

    if (balance.paid_amount > 0) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(34, 197, 94) // emerald
      doc.text('Déjà payé :', 4, y)
      doc.text(`${balance.paid_amount.toFixed(2)} EUR`, w - 2, y, { align: 'right' })
      doc.setTextColor(0, 0, 0)
      y += lineH

      doc.setFont('helvetica', 'bold')
      doc.text('Reste à payer :', 4, y)
      doc.text(`${balance.remaining_amount.toFixed(2)} EUR`, w - 2, y, { align: 'right' })
      y += lineH
    }

    y += 2
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.line(4, y, w - 2, y)
    y += 4
    doc.text('Merci de votre visite !', w / 2, y, { align: 'center' })
    y += lineH
    doc.text(`Réf. #${session.id.slice(0, 8).toUpperCase()}`, w / 2, y, { align: 'center' })

    doc.save(`ardoise-${session.id.slice(0, 8)}.pdf`)
  }

  const btnClass = 'flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 border border-purple-500/30 hover:border-purple-400/50 px-3 py-2 rounded-lg transition-colors cursor-pointer'

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setShowModal(true)}
          className={btnClass}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          Voir ticket
        </button>
        <button
          onClick={downloadPDF}
          className={btnClass}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Ticket PDF
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-zinc-800 shadow-2xl">
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-zinc-800 shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-white">Ticket d'ardoise</h2>
                  <p className="text-sm text-zinc-400 mt-0.5">{restaurantName}</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="bg-zinc-800/40 rounded-xl p-4 mb-4">
                <p className="text-sm text-zinc-400">Table</p>
                <p className="text-lg font-bold text-white">{tableDisplay}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Ouverte le {new Date(session.started_at).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {/* Commandes */}
              <div className="space-y-3 mb-4">
                <p className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Commandes</p>
                {orders.map((order, idx) => (
                  <div key={order.id} className="bg-zinc-800/40 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/40 text-xs font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span className="text-sm text-zinc-400">
                        {new Date(order.created_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {order.order_items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-white">
                            <span className="font-bold text-purple-400">{item.quantity}×</span> {item.item_name}{item.size_label ? ` ${item.size_label}` : ''}
                          </span>
                          <span className="font-semibold text-purple-200">
                            {fmt(item.unit_price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {order.customer_note && (
                      <p className="text-xs text-zinc-500 mt-2 italic bg-zinc-900/40 px-2 py-1 rounded">
                        💬 {order.customer_note}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Totaux */}
              <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border-2 border-purple-400/40 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-purple-300">Total TTC</span>
                  <span className="text-xl font-black text-purple-100">{fmt(balance.total_amount)}</span>
                </div>
                {balance.paid_amount > 0 && (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-purple-400">Déjà payé</span>
                      <span className="text-sm font-semibold text-emerald-400">
                        - {fmt(balance.paid_amount)}
                      </span>
                    </div>
                    <div className="border-t border-purple-400/30 pt-2 flex justify-between items-center">
                      <span className="text-sm font-bold text-purple-200">Reste à payer</span>
                      <span className="text-lg font-black text-purple-100">
                        {fmt(balance.remaining_amount)}
                      </span>
                    </div>
                  </>
                )}
                <p className="text-xs text-zinc-500 mt-3 text-center">
                  Réf. #{session.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-zinc-800 shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
