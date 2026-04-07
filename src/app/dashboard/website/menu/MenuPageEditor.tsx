'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  createMenuSection,
  updateTextSection,
  updateGallerySection,
  deleteSectionById,
  uploadSectionImage,
} from '@/app/actions/restaurant'

type GalleryImage = { url: string; caption: string }
type Section = {
  id: string
  type: 'text_block' | 'gallery'
  position: number
  content: Record<string, unknown>
}

export default function MenuPageEditor({
  pageId,
  restaurantId,
  initialSections,
}: {
  pageId: string
  restaurantId: string
  initialSections: Section[]
}) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState<'before' | 'after' | null>(null)
  const [addPending, startAdd] = useTransition()

  const beforeSections = initialSections.filter(
    s => (s.content as { _placement?: string })._placement === 'before'
  )
  const afterSections = initialSections.filter(
    s => (s.content as { _placement?: string })._placement !== 'before'
  )

  function addSection(type: 'text_block' | 'gallery', placement: 'before' | 'after') {
    setShowAdd(null)
    startAdd(async () => {
      await createMenuSection(pageId, type, placement)
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      {/* Sections AVANT */}
      {beforeSections.map(s => (
        <MenuSectionCard
          key={s.id}
          section={s}
          restaurantId={restaurantId}
          placement="before"
          onRefresh={() => router.refresh()}
        />
      ))}

      {/* Bouton + Avant */}
      <AddButton
        label="Ajouter avant le menu"
        open={showAdd === 'before'}
        pending={addPending}
        onToggle={() => setShowAdd(v => v === 'before' ? null : 'before')}
        onAdd={type => addSection(type, 'before')}
      />

      {/* Bloc Menu — non éditable */}
      <div className="bg-zinc-900/50 border-2 border-dashed border-blue-900/50 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/40">
          <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md bg-blue-900/30 text-blue-400">
            Composant intégré
          </span>
          <span className="text-xs text-zinc-600 flex-1">Non modifiable ici</span>
          <svg className="w-3.5 h-3.5 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        <div className="flex items-center gap-4 px-4 py-5">
          <div className="w-10 h-10 rounded-xl bg-blue-900/20 border border-blue-900/30 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-300">Carte du restaurant</p>
            <p className="text-xs text-zinc-600 mt-0.5">Catégories et plats de l&apos;onglet Menu</p>
          </div>
        </div>
      </div>

      {/* Bouton + Après */}
      <AddButton
        label="Ajouter après le menu"
        open={showAdd === 'after'}
        pending={addPending}
        onToggle={() => setShowAdd(v => v === 'after' ? null : 'after')}
        onAdd={type => addSection(type, 'after')}
      />

      {/* Sections APRÈS */}
      {afterSections.map(s => (
        <MenuSectionCard
          key={s.id}
          section={s}
          restaurantId={restaurantId}
          placement="after"
          onRefresh={() => router.refresh()}
        />
      ))}
    </div>
  )
}

// ─── Add button ───────────────────────────────────────────────

function AddButton({
  label,
  open,
  pending,
  onToggle,
  onAdd,
}: {
  label: string
  open: boolean
  pending: boolean
  onToggle: () => void
  onAdd: (type: 'text_block' | 'gallery') => void
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        disabled={pending}
        className="w-full border-2 border-dashed border-zinc-800 hover:border-zinc-600 rounded-2xl py-3 text-zinc-600 hover:text-zinc-400 transition-colors flex items-center justify-center gap-2 text-xs"
      >
        {pending
          ? <span className="w-3.5 h-3.5 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
          : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
        }
        {label}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-zinc-800 border border-zinc-700 rounded-2xl overflow-hidden z-10 shadow-xl">
          <button
            onClick={() => onAdd('text_block')}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-700 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-zinc-700 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" /></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Bloc texte</p>
              <p className="text-xs text-zinc-500">Titre, sous-titre, paragraphe</p>
            </div>
          </button>
          <button
            onClick={() => onAdd('gallery')}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-700 transition-colors text-left border-t border-zinc-700/50"
          >
            <div className="w-8 h-8 rounded-xl bg-zinc-700 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Galerie photos</p>
              <p className="text-xs text-zinc-500">Slider d&apos;images</p>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Section card ─────────────────────────────────────────────

function MenuSectionCard({
  section,
  restaurantId,
  placement,
  onRefresh,
}: {
  section: Section
  restaurantId: string
  placement: 'before' | 'after'
  onRefresh: () => void
}) {
  const [delPending, startDel] = useTransition()

  const typeLabel = section.type === 'text_block' ? 'Texte' : 'Galerie'
  const typeBg = section.type === 'text_block' ? 'bg-blue-900/30 text-blue-400' : 'bg-purple-900/30 text-purple-400'

  function del() {
    if (!confirm('Supprimer ce composant ?')) return
    startDel(async () => {
      await deleteSectionById(section.id)
      onRefresh()
    })
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/60">
        <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md ${typeBg}`}>
          {typeLabel}
        </span>
        <span className="text-xs text-zinc-700">{placement === 'before' ? 'avant le menu' : 'après le menu'}</span>
        <div className="flex-1" />
        <button
          onClick={del}
          disabled={delPending}
          className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-red-900/40 disabled:opacity-30 text-zinc-500 hover:text-red-400 flex items-center justify-center transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="p-4">
        {section.type === 'text_block'
          ? <MenuTextEditor section={section} placement={placement} />
          : <MenuGalleryEditor section={section} restaurantId={restaurantId} placement={placement} />
        }
      </div>
    </div>
  )
}

// ─── Text editor ──────────────────────────────────────────────

function MenuTextEditor({ section, placement }: { section: Section; placement: 'before' | 'after' }) {
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
        const result = await updateTextSection(section.id, valRef.current.title, valRef.current.subtitle, valRef.current.body, placement)
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
        <textarea value={body} onChange={e => { setBody(e.target.value); triggerSave({ title, subtitle, body: e.target.value }) }} rows={4} maxLength={2000} placeholder="Votre texte ici…" className={`${INPUT} resize-none`} />
      </div>
      <StatusBar status={status} error={error} />
    </div>
  )
}

// ─── Gallery editor ───────────────────────────────────────────

function MenuGalleryEditor({
  section,
  restaurantId,
  placement,
}: {
  section: Section
  restaurantId: string
  placement: 'before' | 'after'
}) {
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
      const result = await updateGallerySection(section.id, imgs, placement)
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
      {images.length === 0 && <p className="text-xs text-zinc-600 text-center py-4">Aucune photo ajoutée</p>}
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
          <button onClick={() => removeImage(i)} className="w-7 h-7 rounded-lg bg-zinc-700 hover:bg-red-900/50 text-zinc-400 hover:text-red-400 flex items-center justify-center transition-colors shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button onClick={() => fileInputRef.current?.click()} disabled={uploadPending} className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-xl transition-colors disabled:opacity-50">
          {uploadPending
            ? <span className="w-3 h-3 border-2 border-zinc-500 border-t-zinc-200 rounded-full animate-spin" />
            : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          }
          Ajouter une photo
        </button>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
        <p className="text-xs text-zinc-700">max 500 Ko</p>
      </div>
      <StatusBar status={status} error={error} />
    </div>
  )
}

// ─── Status bar ─────────────────────────────────────────────────

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
