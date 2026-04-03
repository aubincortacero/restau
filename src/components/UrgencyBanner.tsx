'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type UrgentOrder = {
  id: string
  created_at: string
  table_number: number | null
  table_label: string | null
}

interface Props {
  restaurantId: string
  thresholdMinutes: number
}

export default function UrgencyBanner({ restaurantId, thresholdMinutes }: Props) {
  const [urgentOrders, setUrgentOrders] = useState<UrgentOrder[]>([])

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(
          `/api/orders/pending?restaurantId=${restaurantId}&detail=1`,
          { cache: 'no-store' },
        )
        if (!res.ok) return
        const data = await res.json()
        const threshold = thresholdMinutes * 60 * 1000
        const now = Date.now()
        const urgent = (data.orders as UrgentOrder[]).filter(
          (o) => now - new Date(o.created_at).getTime() > threshold,
        )
        setUrgentOrders(urgent)
      } catch {
        // ignore network errors silently
      }
    }

    check()
    const interval = setInterval(check, 30_000)
    return () => clearInterval(interval)
  }, [restaurantId, thresholdMinutes])

  if (urgentOrders.length === 0) return null

  const tableList = urgentOrders
    .map((o) =>
      o.table_number !== null
        ? `Table ${o.table_number}${o.table_label ? ` – ${o.table_label}` : ''}`
        : 'Table inconnue',
    )
    .join(', ')

  return (
    <div className="bg-orange-600 border-b border-orange-500/60 px-4 py-2.5 flex items-center justify-between gap-3 animate-pulse-slow">
      <div className="flex items-center gap-2 min-w-0">
        <svg
          className="w-4 h-4 text-white shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
        <span className="text-white text-sm font-semibold whitespace-nowrap">
          {urgentOrders.length} commande{urgentOrders.length > 1 ? 's' : ''} &gt; {thresholdMinutes} min
        </span>
        <span className="text-orange-200 text-sm truncate hidden sm:block">· {tableList}</span>
      </div>
      <Link
        href="/dashboard/orders"
        className="text-xs font-bold text-orange-600 bg-white hover:bg-orange-50 px-3 py-1.5 rounded-lg shrink-0 transition-colors"
      >
        Voir →
      </Link>
    </div>
  )
}
