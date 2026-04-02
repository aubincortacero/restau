'use client'

import { useState } from 'react'

type OrderForTicket = {
  id: string
  status: string
  created_at: string
  payment_method: string
  ttc: number
  ht: number
  tva: number
  table: string
  restaurant: string
  items: {
    name: string
    quantity: number
    unit_price: number
    note: string | null
  }[]
}

export default function TicketActions({ order }: { order: OrderForTicket }) {
  const [showModal, setShowModal] = useState(false)

  async function downloadPDF() {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: [80, 200], orientation: 'portrait' })

    const date = new Date(order.created_at).toLocaleString('fr-FR', {
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
    doc.text(order.restaurant, w / 2, y, { align: 'center' })
    y += lineH

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('TICKET DE CAISSE', w / 2, y, { align: 'center' })
    y += lineH

    doc.setLineDashPattern([1, 1], 0)
    doc.line(4, y, w - 2, y)
    y += 4

    doc.setFontSize(8)
    doc.text(`Date : ${date}`, 4, y); y += lineH
    doc.text(`${order.table}`, 4, y); y += lineH
    doc.text(`Paiement : ${order.payment_method === 'online' ? 'En ligne' : 'Caisse'}`, 4, y); y += lineH

    doc.line(4, y, w - 2, y)
    y += 4

    // Articles
    doc.setFont('helvetica', 'bold')
    doc.text('Article', 4, y)
    doc.text('Total', w - 2, y, { align: 'right' })
    y += lineH
    doc.setFont('helvetica', 'normal')

    for (const item of order.items) {
      const total = (item.quantity * item.unit_price).toFixed(2) + ' EUR'
      const label = `${item.quantity}x ${item.name}`
      const lines = doc.splitTextToSize(label, w - 20) as string[]
      doc.text(lines, 4, y)
      doc.text(total, w - 2, y, { align: 'right' })
      y += lines.length * lineH
      if (item.note) {
        doc.setFontSize(7)
        doc.setTextColor(120, 120, 120)
        doc.text(`  → ${item.note}`, 4, y)
        doc.setFontSize(8)
        doc.setTextColor(0, 0, 0)
        y += lineH - 1
      }
    }

    doc.line(4, y, w - 2, y)
    y += 4

    // Totaux
    doc.text(`Montant HT :`, 4, y)
    doc.text(`${order.ht.toFixed(2)} EUR`, w - 2, y, { align: 'right' })
    y += lineH

    doc.text(`TVA 10% :`, 4, y)
    doc.text(`${order.tva.toFixed(2)} EUR`, w - 2, y, { align: 'right' })
    y += lineH

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(`TOTAL TTC :`, 4, y)
    doc.text(`${order.ttc.toFixed(2)} EUR`, w - 2, y, { align: 'right' })
    y += lineH + 2

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.line(4, y, w - 2, y)
    y += 4
    doc.text('Merci de votre visite !', w / 2, y, { align: 'center' })
    y += lineH
    doc.text(`Réf. #${order.id.slice(0, 8).toUpperCase()}`, w / 2, y, { align: 'center' })

    // Resize page height
    const finalH = y + 10
    const doc2 = new jsPDF({ unit: 'mm', format: [80, finalH], orientation: 'portrait' })
    doc2.setFontSize(11); doc2.setFont('helvetica', 'bold')
    // Réécrit tout dans le bon format
    doc.save(`ticket-${order.id.slice(0, 8)}.pdf`)
  }

  const date = new Date(order.created_at).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Paris',
  })

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
        Voir
      </button>
      <button
        onClick={downloadPDF}
        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        Ticket PDF
      </button>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ticket visuel */}
            <div className="font-mono text-xs text-zinc-300 space-y-1">
              <p className="text-center font-bold text-white text-sm mb-1">{order.restaurant}</p>
              <p className="text-center text-zinc-400 text-[11px] mb-2">TICKET DE CAISSE</p>
              <div className="border-t border-dashed border-zinc-600 my-2" />
              <p>{date}</p>
              <p>{order.table}</p>
              <p>Paiement : {order.payment_method === 'online' ? 'En ligne' : 'Caisse'}</p>
              <div className="border-t border-dashed border-zinc-600 my-2" />

              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <span className="truncate">{item.quantity}× {item.name}{item.note ? ` (${item.note})` : ''}</span>
                  <span className="shrink-0">{(item.quantity * item.unit_price).toFixed(2)} €</span>
                </div>
              ))}

              <div className="border-t border-dashed border-zinc-600 my-2" />
              <div className="flex justify-between text-zinc-400">
                <span>HT</span><span>{order.ht.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>TVA 10%</span><span>{order.tva.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between font-bold text-white text-sm mt-1">
                <span>TOTAL TTC</span><span>{order.ttc.toFixed(2)} €</span>
              </div>
              <div className="border-t border-dashed border-zinc-600 my-2" />
              <p className="text-center text-zinc-500">Merci de votre visite !</p>
              <p className="text-center text-zinc-600 text-[10px]">#{order.id.slice(0, 8).toUpperCase()}</p>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={downloadPDF}
                className="flex items-center justify-center gap-1.5 flex-1 bg-orange-500 hover:bg-orange-400 text-white text-xs font-medium py-2 rounded-xl transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Télécharger PDF
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-zinc-700 text-zinc-400 hover:text-white text-xs py-2 rounded-xl transition-colors cursor-pointer"
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
