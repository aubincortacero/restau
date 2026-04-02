'use client'

import { useEffect, useState } from 'react'

export default function HappyHourCountdown({ endsAt }: { endsAt: number }) {
  const [ms, setMs] = useState(() => Math.max(0, endsAt - Date.now()))

  useEffect(() => {
    const id = setInterval(() => setMs(Math.max(0, endsAt - Date.now())), 1000)
    return () => clearInterval(id)
  }, [endsAt])

  if (ms <= 0) return null

  const totalSecs  = Math.floor(ms / 1000)
  const mins       = Math.floor(totalSecs / 60)
  const secs       = totalSecs % 60
  const isCountdown = ms <= 60 * 60 * 1000 // < 1 heure

  const endLabel = new Date(endsAt).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  })

  return (
    <div className="mt-3 inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-4 py-1.5 text-sm font-semibold">
      <span className="animate-pulse">🍹</span>
      {isCountdown
        ? `Happy Hour — encore ${mins}m ${String(secs).padStart(2, '0')}s`
        : `Happy Hour en cours — jusqu'à ${endLabel}`}
    </div>
  )
}
