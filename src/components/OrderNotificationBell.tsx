'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'

// Génère un son de type "ding" avec Web Audio API — pas de fichier audio requis
function playNotificationSound(ctx: AudioContext) {
  const now = ctx.currentTime
  // Première note
  const o1 = ctx.createOscillator()
  const g1 = ctx.createGain()
  o1.type = 'sine'
  o1.frequency.setValueAtTime(880, now)
  o1.frequency.exponentialRampToValueAtTime(660, now + 0.15)
  g1.gain.setValueAtTime(0.4, now)
  g1.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
  o1.connect(g1)
  g1.connect(ctx.destination)
  o1.start(now)
  o1.stop(now + 0.5)
  // Deuxième note (légère variation)
  const o2 = ctx.createOscillator()
  const g2 = ctx.createGain()
  o2.type = 'sine'
  o2.frequency.setValueAtTime(1100, now + 0.18)
  o2.frequency.exponentialRampToValueAtTime(880, now + 0.38)
  g2.gain.setValueAtTime(0, now)
  g2.gain.setValueAtTime(0.35, now + 0.18)
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.7)
  o2.connect(g2)
  g2.connect(ctx.destination)
  o2.start(now + 0.18)
  o2.stop(now + 0.7)
}

type OrderNotif = {
  id: string
  created_at: string
  table_number: number | null
  table_label: string | null
  total: number
  read: boolean
}

const POLL_INTERVAL = 8000

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  return `${Math.floor(diff / 3600)}h`
}

function fmt(p: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(p)
}

export default function OrderNotificationBell({ restaurantId }: { restaurantId: string }) {
  const [notifs, setNotifs] = useState<OrderNotif[]>([])
  const [open, setOpen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const pathname = usePathname()
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement>(null)
  const lastSeenRef = useRef<string>(new Date().toISOString())
  const knownIdsRef = useRef<Set<string>>(new Set())
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Initialise AudioContext sur la première interaction utilisateur
  useEffect(() => {
    function unlock() {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext()
      } else if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume()
      }
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  const unread = notifs.filter((n) => !n.read).length

  const poll = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/orders/recent?restaurantId=${restaurantId}&since=${encodeURIComponent(lastSeenRef.current)}`
      )
      if (!res.ok) return
      const data = await res.json()
      const newOrders: OrderNotif[] = (data.orders ?? [])
        .filter((o: OrderNotif) => !knownIdsRef.current.has(o.id))
        .map((o: OrderNotif) => ({ ...o, read: false }))

      if (newOrders.length > 0) {
        newOrders.forEach((o) => knownIdsRef.current.add(o.id))
        lastSeenRef.current = newOrders[0].created_at
        setNotifs((prev) => [...newOrders, ...prev].slice(0, 20))
        setOpen(true)
        router.refresh()
        // Son de notification
        if (soundEnabled && audioCtxRef.current) {
          if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume()
          playNotificationSound(audioCtxRef.current)
        }
      }
    } catch {
      // silently ignore
    }
  }, [restaurantId, router])

  useEffect(() => {
    const id = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [poll])

  useEffect(() => {
    if (pathname === '/dashboard/orders') {
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
      setOpen(false)
    }
  }, [pathname])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors"
        aria-label="Nouvelles commandes"
      >
        <svg className="w-[18px] h-[18px] text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none animate-pulse">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Nouvelles commandes</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled((v) => !v)}
                className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  soundEnabled
                    ? 'text-orange-400 border-orange-500/30 bg-orange-500/10'
                    : 'text-zinc-500 border-zinc-700 hover:text-zinc-300'
                }`}
                title={soundEnabled ? 'Désactiver le son' : 'Activer le son'}
              >
                {soundEnabled ? '🔔' : '🔕'}
              </button>
              <button
                onClick={() => { router.push('/dashboard/orders'); setOpen(false) }}
                className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
              >
                Tout voir →
              </button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-zinc-800">
            {notifs.length === 0 && (
              <p className="text-sm text-zinc-500 text-center py-6">Aucune notification</p>
            )}
            {notifs.map((n) => (
              <div key={n.id} className={`flex items-start gap-1 ${!n.read ? 'bg-orange-500/5' : ''}`}>
                <button
                  onClick={() => { router.push('/dashboard/orders'); setOpen(false) }}
                  className="flex-1 text-left px-4 py-3 hover:bg-zinc-800/60 transition-colors flex items-start gap-3"
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.read ? 'bg-orange-500' : 'bg-zinc-700'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">
                      {n.table_number
                        ? `Table ${n.table_number}${n.table_label ? ` — ${n.table_label}` : ''}`
                        : 'Table inconnue'}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">{fmt(n.total)}</p>
                  </div>
                  <span className="text-xs text-zinc-600 shrink-0">{timeAgo(n.created_at)}</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setNotifs((prev) => prev.filter((x) => x.id !== n.id)) }}
                  className="p-3 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0"
                  aria-label="Supprimer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
