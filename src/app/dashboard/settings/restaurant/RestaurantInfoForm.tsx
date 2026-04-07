'use client'

import { useState, useRef, useTransition } from 'react'
import { updateRestaurant } from '@/app/actions/restaurant'

const INPUT = "w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"

type SaveStatus = 'idle' | 'saving' | 'saved'

interface Props {
  restaurantId: string
  slug: string
  initial: {
    name: string
    address: string
    phone: string
  }
}

export default function RestaurantInfoForm({ restaurantId, slug, initial }: Props) {
  const [name, setName] = useState(initial.name)
  const [address, setAddress] = useState(initial.address)
  const [phone, setPhone] = useState(initial.phone)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null)

  function triggerAutoSave(nextName = name, nextAddress = address, nextPhone = phone) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!nextName.trim()) return
      const fd = new FormData()
      fd.append('id', restaurantId)
      fd.append('name', nextName)
      fd.append('address', nextAddress)
      fd.append('phone', nextPhone)
      setStatus('saving')
      startTransition(async () => {
        await updateRestaurant(fd)
        setStatus('saved')
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
        savedTimeoutRef.current = setTimeout(() => setStatus('idle'), 2000)
      })
    }, 1000)
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-white">Informations du restaurant</h2>
        <div className="h-5 flex items-center">
          {status === 'saving' && (
            <span className="flex items-center gap-1.5 text-zinc-400 text-xs">
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Enregistrement…
            </span>
          )}
          {status === 'saved' && (
            <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Enregistré
            </span>
          )}
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nom du restaurant</label>
          <input
            name="name"
            required
            value={name}
            onChange={e => { setName(e.target.value); triggerAutoSave(e.target.value, address, phone) }}
            className={INPUT}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Adresse</label>
          <input
            name="address"
            value={address}
            onChange={e => { setAddress(e.target.value); triggerAutoSave(name, e.target.value, phone) }}
            placeholder="12 rue de la Paix, Paris"
            className={INPUT}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Téléphone</label>
          <input
            name="phone"
            type="tel"
            value={phone}
            onChange={e => { setPhone(e.target.value); triggerAutoSave(name, address, e.target.value) }}
            placeholder="06 00 00 00 00"
            className={INPUT}
          />
        </div>

        <p className="text-xs text-zinc-500 pt-1">Slug public : <span className="text-zinc-300">/{slug}</span></p>
      </div>
    </div>
  )
}
