'use client'

import { useTransition, useState } from 'react'
import { updateSchedules } from '@/app/actions/restaurant'

const DAYS = [
  { key: 'mon', label: 'Lundi' },
  { key: 'tue', label: 'Mardi' },
  { key: 'wed', label: 'Mercredi' },
  { key: 'thu', label: 'Jeudi' },
  { key: 'fri', label: 'Vendredi' },
  { key: 'sat', label: 'Samedi' },
  { key: 'sun', label: 'Dimanche' },
]

type DaySchedule = { open: string; close: string; closed: boolean }
type OpeningHours = Record<string, DaySchedule>
type HappyHour = { enabled: boolean; start: string; end: string; days: string[]; urgency_threshold?: number }

interface Props {
  restaurantId: string
  opening_hours: OpeningHours
  happy_hour: HappyHour
  urgencyThreshold: number
}

const INPUT_TIME = "bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 w-28"

export default function SchedulesForm({ restaurantId, opening_hours, happy_hour, urgencyThreshold }: Props) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setSaved(false)
    startTransition(async () => {
      await updateSchedules(fd)
      setSaved(true)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
      <input type="hidden" name="id" value={restaurantId} />

      {/* Horaires d'ouverture */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-5">Horaires d&apos;ouverture</h2>
        <div className="space-y-3">
          {DAYS.map(({ key, label }) => {
            const day = opening_hours[key] ?? { open: '12:00', close: '22:00', closed: false }
            return (
              <div key={key} className="flex items-center gap-3">
                {/* Ouvert toggle — checked = ouvert, unchecked = fermé */}
                <label className="flex items-center gap-2 cursor-pointer w-28 shrink-0">
                  <input
                    type="checkbox"
                    name={`oh_${key}_open`}
                    value="1"
                    defaultChecked={!day.closed}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-zinc-700 rounded-full peer peer-checked:bg-orange-500 relative after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 shrink-0" />
                  <span className="text-sm text-zinc-300">{label}</span>
                </label>

                <input type="time" name={`oh_${key}_open_time`} defaultValue={day.open} className={INPUT_TIME} />
                <span className="text-zinc-600 text-xs">→</span>
                <input type="time" name={`oh_${key}_close`} defaultValue={day.close} className={INPUT_TIME} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Happy Hour */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-white">Happy Hour 🍹</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-zinc-400">Activer</span>
            <div className="relative">
              <input type="hidden" name="hh_enabled" value="0" />
              <input
                type="checkbox"
                name="hh_enabled"
                value="1"
                defaultChecked={happy_hour.enabled}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-zinc-700 rounded-full peer peer-checked:bg-orange-500 after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
            </div>
          </label>
        </div>

        {/* Plage horaire */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-xs text-zinc-400 w-20">De</span>
          <input type="time" name="hh_start" defaultValue={happy_hour.start} className={INPUT_TIME} />
          <span className="text-zinc-600 text-xs">→</span>
          <input type="time" name="hh_end" defaultValue={happy_hour.end} className={INPUT_TIME} />
        </div>

        {/* Jours */}
        <div>
          <p className="text-xs text-zinc-400 mb-3">Jours concernés</p>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(({ key, label }) => (
              <label key={key} className="cursor-pointer select-none">
                <input
                  type="checkbox"
                  name={`hh_day_${key}`}
                  value="1"
                  defaultChecked={happy_hour.days.includes(key)}
                  className="sr-only peer"
                />
                <span className="block text-xs px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 peer-checked:border-amber-500/50 peer-checked:bg-amber-500/10 peer-checked:text-amber-300 transition-colors">
                  {label.slice(0, 3)}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Urgence commandes */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-1">⏱ Alertes commandes</h2>
        <p className="text-xs text-zinc-500 mb-4">
          Un bandeau d&apos;urgence s&apos;affiche quand une commande est en attente depuis plus longtemps que ce seuil.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            name="urgency_threshold"
            min={1}
            max={60}
            defaultValue={urgencyThreshold}
            className={INPUT_TIME + ' w-20'}
          />
          <span className="text-sm text-zinc-400">minutes</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
        >
          {isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {saved && !isPending && (
          <span className="text-sm text-emerald-400">✓ Enregistré</span>
        )}
      </div>
    </form>
  )
}
