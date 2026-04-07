'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  createSection,
  updateTextSection,
  updateGallerySection,
  deleteSectionById,
  moveSectionDir,
  uploadSectionImage,
} from '@/app/actions/restaurant'

type GalleryImage = { url: string; caption: string }
type Section = {
  id: string
  type: 'text_block' | 'gallery'
  position: number
  content: Record<string, unknown>
}

export default function PageEditor({
  pageId,
  restaurantId,
  initialSections,
}: {
  pageId: string
  restaurantId: string
  initialSections: Section[]
}) {
  const router = useRouter()
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [addPending, startAdd] = useTransition()

  function addSection(type: 'text_block' | 'gallery') {
    setShowAddMenu(false)
    startAdd(async () => {
      await createSection(pageId, type)
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      {initialSections.map((s, i) => (
        <SectionCard
          key={s.id}
          section={s}
          pageId={pageId}
          restaurantId={restaurantId}
          isFirst={i === 0}
          isLast={i === initialSections.length - 1}
          onRefresh={() => router.refresh()}
        />
      ))}

      {/* Bouton ajouter composant */}
      <div className="relative">
        <button
          onClick={() => setShowAddMenu(v => !v)}
          disabled={addPending}
          className="w-full border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-2xl py-4 text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          {addPending
            ? <span className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
            : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          }
          Ajouter un composant
        </button>

        {showAddMenu && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-zinc-800 border border-zinc-700 rounded-2xl overflow-hidden z-10 shadow-xl">
            <button
              onClick={() => addSection('text_block')}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-700 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-zinc-700 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Bloc texte</p>
                <p className="text-xs text-zinc-500">Titre, sous-titre, paragraphe</p>
              </div>
            </button>
            <button
              onClick={() => addSection('gallery')}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-700 transition-colors text-left border-t border-zinc-700/50"
            >
              <div className="w-9 h-9 rounded-xl bg-zinc-700 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Galerie photos</p>
                <p className="text-xs text-zinc-500">Slider d&apos;images</p>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Section card ────────────────────────────────────────────

function SectionCard({
  section,
  pageId,
  restaurantId,
  isFirst,
  isLast,
  onRefresh,
}: {
  section: Section
  pageId: string
  restaurantId: string
  isFirst: boolean
  isLast: boolean
  onRefresh: () => void
}) {
  const [actionPending, startAction] = useTransition()

  const typeLabel = section.type === 'text_block' ? 'Texte' : 'Galerie'
  const typeBg = section.type === 'text_block' ? 'bg-blue-900/30 text-blue-400' : 'bg-purple-900/30 text-purple-400'

  function move(dir: 'up' | 'down') {
    startAction(async () => {
      await moveSectionDir(section.id, pageId, dir)
      onRefresh()
    })
  }

  function del() {
    if (!confirm('Supprimer ce composant ?')) return
    startAction(async () => {
      await deleteSectionById(section.id)
      onRefresh()
    })
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Header barre */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/60">
        <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md ${typeBg}`}>
          {typeLabel}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <button
            onClick={() => move('up')}
            disabled={isFirst || actionPending}
            className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-400 flex items-center justify-center transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>
          </button>
          <button
            onClick={() => move('down')}
            disabled={isLast || actionPending}
            className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-400 flex items-center justify-center transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
          </button>
          <button
            onClick={del}
            disabled={actionPending}
            className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-red-900/40 disabled:opacity-30 text-zinc-500 hover:text-red-400 flex items-center justify-center transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* Éditeur */}
      <div className="p-4">
        {section.type === 'text_block' ? (
          <TextBlockEditor section={section} />
        ) : (
          <GalleryEditor section={section} restaurantId={restaurantId} />
        )}
      </div>
    </div>
  )
}

// ─── Text block editor ────────────────────────────────────────

function TextBlockEditor({ section }: { section: Section }) {
  const c = section.content as { title?: string; subtitle?: string; body?: string }
  const [title, setTitle] = useState(c.title ?? '')
  const [subtitle, setSubtitle] = useState(c.subtitle ?? '')
  const [body, setBody] = useState(c.body ?? '')
  const [, startPending] = useTransition()
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const valRef = useRef({ title: c.title ?? '', subtitle: c.subtitle ?? '', body: c.body ?? '' })

  function triggerSave(next: { title: string; subtitle: string; body: string }) {
    valRef.current = next
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setStatus('saving'); setError(null)
      startPending(async () => {
        const result = await updateTextSection(section.id, valRef.current.title, valRef.current.subtitle, valRef.current.body)
        if (result.error) { setError(result.error); setStatus('idle') }
        else { setStatus('saved'); setTimeout(() => setStatus('idle'), 2000) }
      })
    }, 1000)
  }

  const INPUT = "w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Titre</label>
        <input value={title} onChange={e => { setTitle(e.target.value); triggerSave({ title: e.target.value, subtitle, body }) }} placeholder="Notre histoire" className={INPUT} />
      </div>
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Sous-titre</label>
        <input value={subtitle} onChange={e => { setSubtitle(e.target.value); triggerSave({ title, subtitle: e.target.value, body }) }} placeholder="Depuis 2010…" className={INPUT} />
      </div>
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Texte</label>
        <textarea
          value={body}
          onChange={e => { setBody(e.target.value); triggerSave({ title, subtitle, body: e.target.value }) }}
          rows={4}
          maxLength={2000}
          placeholder="Votre texte ici…"
          className={`${INPUT} resize-none`}
        />
      </div>
      <StatusBar status={status} error={error} />
    </div>
  )
}

// ─── Gallery editor ───────────────────────────────────────────

function GalleryEditor({ section, restaurantId }: { section: Section; restaurantId: string }) {
  const c = section.content as { images?: GalleryImage[] }
  const [images, setImages] = useState<GalleryImage[]>(c.images ?? [])
  const [, startSave] = useTransition()
  const [uploadPending, startUpload] = useTransition()
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imagesRef = useRef(images)
  imagesRef.current = images
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  function doSave(imgs: GalleryImage[]) {
    setStatus('saving'); setError(null)
    startSave(async () => {
      const result = await updateGallerySection(section.id, imgs)
      if (result.error) { setError(result.error); setStatus('idle') }
      else { setStatus('saved'); setTimeout(() => setStatus('idle'), 2000) }
    })
  }

  function saveDebounced(imgs: GalleryImage[]) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSave(imgs), 1000)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) { setError('Image trop lourde (max 500 Ko).'); return }
    setError(null)
    startUpload(async () => {
      const result = await uploadSectionImage(restaurantId, section.id, file)
      if (result.error) { setError(result.error) }
      else if (result.url) {
        const next = [...imagesRef.current, { url: result.url!, caption: '' }]
        setImages(next)
        doSave(next)
      }
      if (fileInputRef.current) fileInputRef.current.value = ''
    })
  }

  function removeImage(i: number) {
    const next = images.filter((_, idx) => idx !== i)
    setImages(next)
    doSave(next)
  }

  function updateCaption(i: number, caption: string) {
    const next = images.map((img, idx) => idx === i ? { ...img, caption } : img)
    setImages(next)
    saveDebounced(next)
  }

  return (
    <div className="space-y-3">
      {images.length === 0 && (
        <p className="text-xs text-zinc-600 text-center py-4">Aucune photo ajoutée</p>
      )}
      {images.map((img, i) => (
        <div key={img.url + i} className="flex items-center gap-3 bg-zinc-800/50 rounded-xl p-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt="" className="w-16 h-12 object-cover rounded-lg shrink-0" />
          <input
            type="text"
            value={img.caption}
            onChange={e => updateCaption(i, e.target.value)}
            placeholder="Légende (optionnel)"
            className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
          />
          <button
            onClick={() => removeImage(i)}
            className="w-7 h-7 rounded-lg bg-zinc-700 hover:bg-red-900/50 text-zinc-400 hover:text-red-400 flex items-center justify-center transition-colors shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadPending}
          className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
        >
          {uploadPending
            ? <span className="w-3 h-3 border-2 border-zinc-500 border-t-zinc-200 rounded-full animate-spin" />
            : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          }
          Ajouter une photo
        </button>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
        <p className="text-xs text-zinc-700">JPG, PNG, WebP · max 500 Ko</p>
      </div>

      <StatusBar status={status} error={error} />
    </div>
  )
}

// ─── Status bar ───────────────────────────────────────────────

function StatusBar({ status, error }: { status: 'idle' | 'saving' | 'saved'; error: string | null }) {
  return (
    <div className="h-5 flex items-center">
      {status === 'saving' && (
        <span className="flex items-center gap-1.5 text-zinc-400 text-xs">
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Enregistrement…
        </span>
      )}
      {status === 'saved' && (
        <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
          Enregistré
        </span>
      )}
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </div>
  )
}
