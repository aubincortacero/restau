'use client'

import { useState, useRef, useActionState, useEffect } from 'react'
import { updateAppearance, updateCoverImage } from '@/app/actions/restaurant'

const MAX_COVER_SIZE = 5 * 1024 * 1024 // 5 Mo

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
    cover_image_url?: string | null
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
  const [coverPreview, setCoverPreview] = useState<string | null>(initial.cover_image_url ?? null)
  const [clientError, setClientError] = useState<string | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [coverState, coverAction, coverPending] = useActionState(updateCoverImage, {})

  // Réinitialiser l'erreur client si succès serveur
  useEffect(() => {
    if (coverState.success) setClientError(null)
  }, [coverState.success])

  const isPreset = PRESET_COLORS.some(p => p.hex === color)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_COVER_SIZE) {
      setClientError(`Image trop lourde (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum 5 Mo.`)
      e.target.value = ''
      return
    }
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!ALLOWED.includes(file.type)) {
      setClientError('Format non supporté. Utilisez JPG, PNG ou WebP.')
      e.target.value = ''
      return
    }
    setClientError(null)
    setCoverPreview(URL.createObjectURL(file))
  }

  const coverError = clientError ?? coverState.error

  return (
    <>
    <form action={coverAction} className="space-y-4 mb-7">
      <input type="hidden" name="id" value={restaurantId} />
      <div>
        <p className="text-xs font-medium text-zinc-400 mb-3">Photo de couverture <span className="text-zinc-600">(hero du menu client)</span></p>
        <div
          className="relative w-full h-32 rounded-xl overflow-hidden border-2 border-dashed border-zinc-700 hover:border-zinc-500 cursor-pointer transition-colors group"
          onClick={() => coverInputRef.current?.click()}
          style={{ background: coverPreview ? 'none' : '#18181b' }}
        >
          {coverPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverPreview} alt="Couverture" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-600 group-hover:text-zinc-400 transition-colors">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              <span className="text-xs">Cliquer pour ajouter une photo</span>
            </div>
          )}
          {coverPreview && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-medium bg-black/50 px-3 py-1.5 rounded-lg">Changer la photo</span>
            </div>
          )}
        </div>
        <input
          ref={coverInputRef}
          type="file"
          name="cover"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />
        <p className="text-xs text-zinc-600 mt-1.5">JPG, PNG ou WebP · max 5 Mo</p>
      </div>

      {coverError && (
        <div className="flex items-center gap-2 bg-red-950/60 border border-red-800/60 rounded-xl px-3.5 py-2.5 text-red-400 text-xs">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          {coverError}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={coverPending || !!clientError}
          className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
        >
          {coverPending && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
          Enregistrer la photo
        </button>
        {coverState.success && !coverError && (
          <span className="inline-flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
            Enregistré
          </span>
        )}
      </div>
    </form>

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
    </>
  )
}
