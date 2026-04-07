'use client'

import { useState, useRef, useTransition } from 'react'
import { uploadPageCover } from '@/app/actions/restaurant'

const MAX_SIZE = 500 * 1024 // 500 Ko
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface Props {
  pageId: string
  restaurantId: string
  initialUrl?: string | null
}

export default function PageCoverUpload({ pageId, restaurantId, initialUrl }: Props) {
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null)
  const [clientError, setClientError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_SIZE) {
      setClientError(`Image trop lourde (${(file.size / 1024).toFixed(0)} Ko). Maximum 500 Ko.`)
      e.target.value = ''
      return
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setClientError('Format non supporté. Utilisez JPG, PNG ou WebP.')
      e.target.value = ''
      return
    }
    setClientError(null)
    setServerError(null)
    setSaved(false)
    setPreview(URL.createObjectURL(file))

    startTransition(async () => {
      const result = await uploadPageCover(pageId, restaurantId, file)
      if (result.error) {
        setServerError(result.error)
      } else {
        setSaved(true)
        if (result.url) setPreview(result.url)
      }
    })
  }

  const error = clientError ?? serverError

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-zinc-400">
        Image d&apos;en-tête <span className="text-zinc-600">(hero de la page)</span>
      </p>

      <div
        className="relative w-full rounded-xl overflow-hidden border-2 border-dashed border-zinc-700 hover:border-zinc-500 cursor-pointer transition-colors group"
        onClick={() => inputRef.current?.click()}
        style={{ background: preview ? 'none' : '#18181b' }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Couverture" className="w-full h-auto block" />
        ) : (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-zinc-600 group-hover:text-zinc-400 transition-colors">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            <span className="text-xs">Cliquer pour ajouter une photo</span>
          </div>
        )}

        {preview && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-xs font-medium bg-black/50 px-3 py-1.5 rounded-lg">
              Changer la photo
            </span>
          </div>
        )}

        {isPending && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <p className="text-xs text-zinc-600">JPG, PNG ou WebP · max 500 Ko</p>

      {error && (
        <div className="flex items-center gap-2 bg-red-950/60 border border-red-800/60 rounded-xl px-3.5 py-2.5 text-red-400 text-xs">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          {error}
        </div>
      )}

      {saved && !error && (
        <span className="inline-flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          Photo enregistrée
        </span>
      )}
    </div>
  )
}
