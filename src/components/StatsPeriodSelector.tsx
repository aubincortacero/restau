'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'

const PERIODS = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week',  label: '7 jours' },
  { value: 'month', label: '30 jours' },
  { value: 'custom', label: 'Personnalisé' },
]

export default function StatsPeriodSelector({
  period,
  from,
  to,
  compare,
}: {
  period: string
  from?: string
  to?: string
  compare: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const today = new Date().toISOString().split('T')[0]
  const [customFrom, setCustomFrom] = useState(from ?? today)
  const [customTo, setCustomTo]     = useState(to ?? today)

  function buildUrl(p: string, f?: string, t?: string, cmp?: boolean) {
    const params = new URLSearchParams()
    params.set('period', p)
    if (p === 'custom' && f && t) {
      params.set('from', f)
      params.set('to', t)
    }
    if (cmp ?? compare) params.set('compare', '1')
    return `${pathname}?${params.toString()}`
  }

  function toggleCompare() {
    router.push(buildUrl(period, from, to, !compare))
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-wrap">
      {/* Period tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => router.push(buildUrl(p.value))}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              period === p.value
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom range inputs */}
      {period === 'custom' && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={customFrom}
            max={customTo}
            onChange={e => setCustomFrom(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none cursor-pointer"
          />
          <span className="text-zinc-600 text-xs">→</span>
          <input
            type="date"
            value={customTo}
            min={customFrom}
            max={today}
            onChange={e => setCustomTo(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none cursor-pointer"
          />
          <button
            onClick={() => router.push(buildUrl('custom', customFrom, customTo))}
            disabled={!customFrom || !customTo}
            className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Appliquer
          </button>
        </div>
      )}

      {/* Compare toggle */}
      <button
        onClick={toggleCompare}
        className={`sm:ml-auto flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
          compare
            ? 'border-orange-500/40 bg-orange-500/10 text-orange-400'
            : 'border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600'
        }`}
      >
        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors shrink-0 ${
          compare ? 'bg-orange-500 border-orange-500' : 'border-zinc-600'
        }`}>
          {compare && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          )}
        </span>
        Comparer période précédente
      </button>
    </div>
  )
}
