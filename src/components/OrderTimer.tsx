'use client'

import { useEffect, useState } from 'react'

interface Props {
  createdAt: string
  thresholdMinutes: number
}

function elapsed(createdAt: string) {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  if (diff < 60) return { label: `${diff}s`, minutes: 0 }
  const m = Math.floor(diff / 60)
  const s = diff % 60
  return { label: `${m}min${s > 0 ? ` ${s}s` : ''}`, minutes: m }
}

export default function OrderTimer({ createdAt, thresholdMinutes }: Props) {
  const [time, setTime] = useState(() => elapsed(createdAt))

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(elapsed(createdAt))
    }, 1000)
    return () => clearInterval(interval)
  }, [createdAt])

  const isUrgent = time.minutes >= thresholdMinutes

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
        isUrgent
          ? 'bg-red-500/15 text-red-400 animate-pulse'
          : 'bg-zinc-700/60 text-zinc-400'
      }`}
    >
      <svg
        className="w-3 h-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
      </svg>
      {time.label}
    </span>
  )
}
