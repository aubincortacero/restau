'use client'

import { useState, useRef } from 'react'
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

interface Props {
  restaurantId: string
  initial: {
    brand_color: string
    menu_button_radius: string
    menu_header_style: string
    logo_url?: string | null
    menu_max_width?: number | null
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
  const [logoPreview, setLogoPreview] = useState<string | null>(initial.logo_url ?? null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [maxWidth, setMaxWidth] = useState<string>(initial.menu_max_width ? String(initial.menu_max_width) : '')
  const logoInputRef = useRef<HTMLInputElement>(null)

  const isPreset = PRESET_COLORS.some(p => p.hex === color)

  return (
    <form action={updateAppearance} className="space-y-7" encType="multipart/form-data">
      <input type="hidden" name="id" value={restaurantId} />
      <input type="hidden" name="brand_color" value={color} />
      <input type="hidden" name="menu_button_radius" value={radius} />
      <input type="hidden" name="menu_header_style" value={headerStyle} />
      <input type="hidden" name="remove_logo" value={removeLogo ? '1' : '0'} />

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

      {/* Logo */}
      <div>
        <p className="text-xs font-medium text-zinc-400 mb-3">Logo</p>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
            {logoPreview && !removeLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <svg className="w-7 h-7 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium text-zinc-300 px-3 py-2 rounded-xl cursor-pointer transition-colors">
              <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
              Choisir un fichier
              <input
                ref={logoInputRef}
                type="file"
                name="logo"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                className="sr-only"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setLogoPreview(URL.createObjectURL(file))
                    setRemoveLogo(false)
                  }
                }}
              />
            </label>
            {(logoPreview && !removeLogo) && (
              <button
                type="button"
                onClick={() => { setRemoveLogo(true); setLogoPreview(null); if (logoInputRef.current) logoInputRef.current.value = '' }}
                className="text-xs text-red-400 hover:text-red-300 transition-colors text-left"
              >
                Supprimer le logo
              </button>
            )}
            <p className="text-[10px] text-zinc-600">JPG, PNG, WebP, SVG — max 500 Ko</p>
          </div>
        </div>
      </div>

      {/* Largeur max */}
      <div>
        <p className="text-xs font-medium text-zinc-400 mb-3">Largeur du menu <span className="text-zinc-600">(px)</span></p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            name="menu_max_width"
            value={maxWidth}
            onChange={e => setMaxWidth(e.target.value)}
            placeholder="Illimitée"
            min={320}
            max={1600}
            className="w-36 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
          />
          <span className="text-xs text-zinc-500">Laisser vide pour illimitée (320–1600 px)</span>
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

