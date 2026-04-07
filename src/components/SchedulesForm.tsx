'use client'

import { useTransition, useState, useRef, useEffect } from 'react'
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

type SaveStatus = 'idle' | 'saving' | 'saved'

const INPUT_TIME = "bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 w-28"

export default function SchedulesForm({ restaurantId, opening_hours, happy_hour, urgencyThreshold }: Props) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [hours, setHours] = useState<OpeningHours>(() =>
    DAYS.reduce((acc, { key }) => ({
      ...acc,
      [key]: opening_hours[key] ?? { open: '12:00', close: '22:00', closed: false },
    }), {} as OpeningHours)
  )
  const formRef = useRef<HTMLFormElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null)

  function triggerAutoSave() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!formRef.current) return
      const fd = new FormData(formRef.current)
      setStatus('saving')
      startTransition(async () => {
        await updateSchedules(fd)
        setStatus('saved')
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
        savedTimeoutRef.current = setTimeout(() => setStatus('idle'), 2000)
      })
    }, 1000)
  }

  // Auto-save when hours state changes (time inputs are controlled)
  useEffect(() => {
    triggerAutoSave()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
    }
  }, [])

  return (
    <form ref={formRef} className="max-w-xl space-y-6">
      <input type="hidden" name="id" value={restaurantId} />

      {/* Horaires d'ouverture */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-5">Horaires d&apos;ouverture</h2>
        <div className="space-y-3">
          {DAYS.map(({ key, label }) => {
            const day = hours[key] ?? { open: '12:00', close: '22:00', closed: false }
            const [oh, om] = day.open.split(':').map(Number)
            const [ch, cm] = day.close.split(':').map(Number)
            const crossesMidnight = (oh * 60 + om) > (ch * 60 + cm)
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
                    onChange={triggerAutoSave}
                  />
                  <div className="w-8 h-4 bg-zinc-700 rounded-full peer peer-checked:bg-orange-500 relative after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 shrink-0" />
                  <span className="text-sm text-zinc-300">{label}</span>
                </label>

                <input type="time" name={`oh_${key}_open_time`} value={day.open}
                  onChange={e => setHours(p => ({ ...p, [key]: { ...p[key], open: e.target.value } }))}
                  className={INPUT_TIME} />
                <span className="text-zinc-600 text-xs">→</span>
                <input type="time" name={`oh_${key}_close`} value={day.close}
                  onChange={e => setHours(p => ({ ...p, [key]: { ...p[key], close: e.target.value } }))}
                  className={INPUT_TIME} />
                {crossesMidnight && (
                  <span className="text-[10px] font-semibold text-orange-400 shrink-0" title="Fermeture le lendemain">+1</span>
                )}
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
                onChange={triggerAutoSave}
              />
              <div className="w-10 h-5 bg-zinc-700 rounded-full peer peer-checked:bg-orange-500 after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
            </div>
          </label>
        </div>

        {/* Plage horaire */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-xs text-zinc-400 w-20">De</span>
          <input type="time" name="hh_start" defaultValue={happy_hour.start} className={INPUT_TIME} onChange={triggerAutoSave} />
          <span className="text-zinc-600 text-xs">→</span>
          <input type="time" name="hh_end" defaultValue={happy_hour.end} className={INPUT_TIME} onChange={triggerAutoSave} />
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
                  onChange={triggerAutoSave}
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
            onChange={triggerAutoSave}
          />
          <span className="text-sm text-zinc-400">minutes</span>
        </div>
      </div>

      <div className="h-6 flex items-center">
        {status === 'saving' && (
          <span className="flex items-center gap-1.5 text-zinc-400 text-xs">
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Enregistrement…
          </span>
        )}
        {status === 'saved' && !isPending && (
          <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Enregistré
          </span>
        )}
      </div>
    </form>
  )
}
