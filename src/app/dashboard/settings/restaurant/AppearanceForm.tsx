'use client'

import { useState } from 'react'
import { updateAppearance } from '@/app/actions/restaurant'

const PRESET_COLORS = [
  { hex: '#f97316', label: 'Orange' },
  { hex: '#ef4444', label: 'Rouge' },
  { hex: '#ec4899', label: 'Rose' },
  { hex: '#a855f7', label: 'Violet' },
  { hex: '#3b82f6', label: 'Bleu' },
  { hex: '#06b6d4', label: 'Cyan' },
  { hex: '#10b981', label: 'Vert' },
  { hex: '#84cc16', label: 'Lime' },
  { hex: '#eab308', label: 'Jaune' },
  { hex: '#78716c', label: 'Gris chaud' },
]

const RADIUS_OPTIONS = [
  { value: 'sharp', label: 'Carré', preview: '2px' },
  { value: 'rounded', label: 'Arrondi', preview: '10px' },
  { value: 'pill', label: 'Pilule', preview: '9999px' },
]

const HEADER_OPTIONS = [
  { value: 'dark', label: 'Sombre', desc: 'Fond noir, texte blanc' },
  { value: 'colored', label: 'Coloré', desc: 'Fond couleur de marque' },
  { value: 'light', label: 'Clair', desc: 'Fond blanc, texte sombre' },
]

interface Props {
  restaurantId: string
  initial: {
    brand_color: string
    menu_button_radius: string
    menu_header_style: string
  }
  saved: boolean
}

export default function AppearanceForm({ restaurantId, initial, saved }: Props) {
  const [color, setColor] = useState(initial.brand_color || '#f97316')
  const [radius, setRadius] = useState(initial.menu_button_radius || 'rounded')
  const [headerStyle, setHeaderStyle] = useState(initial.menu_header_style || 'dark')
  const [customHex, setCustomHex] = useState(
    PRESET_COLORS.some(p => p.hex === initial.brand_color) ? '' : (initial.brand_color || '')
  )

  const isPreset = PRESET_COLORS.some(p => p.hex === color)

  return (
    <form action={updateAppearance} className="space-y-7">
      <input type="hidden" name="id" value={restaurantId} />
      <input type="hidden" name="brand_color" value={color} />
      <input type="hidden" name="menu_button_radius" value={radius} />
      <input type="hidden" name="menu_header_style" value={headerStyle} />

      {/* Couleur de marque */}
      <div>
        <p className="text-xs font-medium text-zinc-400 mb-3">Couleur principale</p>
        <div className="flex flex-wrap gap-2.5 mb-3">
          {PRESET_COLORS.map(p => (
            <button
              key={p.hex}
              type="button"
              title={p.label}
              onClick={() => { setColor(p.hex); setCustomHex('') }}
              className="relative w-8 h-8 rounded-full transition-transform hover:scale-110 focus:outline-none"
              style={{ backgroundColor: p.hex }}
            >
              {color === p.hex && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </span>
              )}
            </button>
          ))}
          {/* Custom color picker */}
          <label
            className="relative w-8 h-8 rounded-full border-2 border-dashed border-zinc-600 hover:border-zinc-400 flex items-center justify-center cursor-pointer transition-colors overflow-hidden"
            title="Couleur personnalisée"
            style={!isPreset && color ? { backgroundColor: color, borderColor: color } : {}}
          >
            {isPreset || !color ? (
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            )}
            <input
              type="color"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              value={color}
              onChange={e => { setColor(e.target.value); setCustomHex(e.target.value) }}
            />
          </label>
        </div>
        {/* Hex display */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full shrink-0 border border-zinc-700" style={{ backgroundColor: color }} />
          <span className="text-xs text-zinc-500 font-mono">{color.toUpperCase()}</span>
        </div>
      </div>

      {/* Style des boutons (menu client) */}
      <div>
        <p className="text-xs font-medium text-zinc-400 mb-3">Style des boutons <span className="text-zinc-600">(menu client)</span></p>
        <div className="flex gap-2.5">
          {RADIUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRadius(opt.value)}
              className={`flex-1 flex flex-col items-center gap-2 py-3 px-2 rounded-xl border-2 transition-all ${
                radius === opt.value ? 'border-zinc-400 bg-zinc-800' : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
              }`}
            >
              <div
                className="w-16 h-7 transition-all"
                style={{ backgroundColor: color, borderRadius: opt.preview }}
              />
              <span className="text-xs text-zinc-400">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Style du header menu client */}
      <div>
        <p className="text-xs font-medium text-zinc-400 mb-3">Bandeau du menu <span className="text-zinc-600">(menu client)</span></p>
        <div className="flex gap-2">
          {HEADER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setHeaderStyle(opt.value)}
              className={`flex-1 flex flex-col gap-1.5 p-3 rounded-xl border-2 transition-all text-left ${
                headerStyle === opt.value ? 'border-zinc-400 bg-zinc-800' : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
              }`}
            >
              {/* Mini preview */}
              <div
                className="w-full h-6 rounded-md"
                style={{
                  backgroundColor: opt.value === 'colored' ? color : opt.value === 'light' ? '#f4f4f5' : '#09090b',
                }}
              />
              <span className="text-xs font-medium text-zinc-300">{opt.label}</span>
              <span className="text-[10px] text-zinc-600 leading-tight">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
        >
          Enregistrer
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
            Enregistré
          </span>
        )}
      </div>
    </form>
  )
}
