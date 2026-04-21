'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export default function PendingOrdersFloat({ restaurantId }: { restaurantId: string }) {
  const [count, setCount] = useState(0)
  const pathname = usePathname()
  const router = useRouter()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchCount() {
    try {
      const res = await fetch(`/api/orders/pending?restaurantId=${restaurantId}`)
      if (!res.ok) return
      const data = await res.json()
      setCount(data.count ?? 0)
    } catch {
      // silently ignore
    }
  }

  useEffect(() => {
    fetchCount()
    intervalRef.current = setInterval(fetchCount, 8000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId])

  // Rafraîchit immédiatement quand on revient sur orders
  useEffect(() => {
    if (pathname === '/dashboard/orders') {
      fetchCount()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Masqué sur la page commandes ou si aucune commande en attente
  if (pathname === '/dashboard/orders' || count === 0) return null

  return (
    <button
      onClick={() => router.push('/dashboard/orders')}
      className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 group flex items-center gap-3 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white pl-4 pr-5 py-3.5 rounded-2xl shadow-2xl shadow-orange-900/40 transition-all hover:scale-105 active:scale-95"
    >
      {/* Icône cloche */}
      <div className="relative shrink-0">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-white text-orange-500 text-[9px] font-black rounded-full flex items-center justify-center leading-none animate-pulse">
          {count > 9 ? '9+' : count}
        </span>
      </div>

      {/* Texte */}
      <div className="text-left">
        <p className="text-sm font-bold leading-tight">
          {count === 1 ? '1 commande en attente' : `${count} commandes en attente`}
        </p>
        <p className="text-xs text-orange-100/80 leading-tight">Voir les commandes →</p>
      </div>
    </button>
  )
}
