'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  createMenuSection,
  updateTextSection,
  updateGallerySection,
  deleteSectionById,
  reorderPageSections,
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
  const [, startReorder] = useTransition()

  const [beforeSections, setBeforeSections] = useState(() =>
    initialSections.filter(s => (s.content as { _placement?: string })._placement === 'before')
  )
  const [afterSections, setAfterSections] = useState(() =>
    initialSections.filter(s => (s.content as { _placement?: string })._placement !== 'before')
  )

  useEffect(() => {
    setBeforeSections(initialSections.filter(s => (s.content as { _placement?: string })._placement === 'before'))
    setAfterSections(initialSections.filter(s => (s.content as { _placement?: string })._placement !== 'before'))
  }, [initialSections])

  // Drag state for each group
  const beforeDragFrom = useRef<number | null>(null)
  const [beforeDragOver, setBeforeDragOver] = useState<number | null>(null)
  const afterDragFrom = useRef<number | null>(null)
  const [afterDragOver, setAfterDragOver] = useState<number | null>(null)

  function makeHandlers(group: 'before' | 'after') {
    const sections = group === 'before' ? beforeSections : afterSections
    const setSections = group === 'before' ? setBeforeSections : setAfterSections
    const dragFrom = group === 'before' ? beforeDragFrom : afterDragFrom
    const setDragOver = group === 'before' ? setBeforeDragOver : setAfterDragOver
    return {
      onDragStart: (i: number) => { dragFrom.current = i },
      onDragOver: (i: number) => { setDragOver(v => v === i ? v : i) },
      onDragEnd: () => { dragFrom.current = null; setDragOver(null) },
      onDrop: (i: number) => {
        if (dragFrom.current === null || dragFrom.current === i) { setDragOver(null); return }
        const next = [...sections]
        const [moved] = next.splice(dragFrom.current, 1)
        next.splice(i, 0, moved)
        setSections(next); setDragOver(null); dragFrom.current = null
        startReorder(async () => {
          await reorderPageSections(next.map((s, pos) => ({ id: s.id, position: pos })))
        })
      },
      dragOverIdx: group === 'before' ? beforeDragOver : afterDragOver,
    }
  }

  const beforeHandlers = makeHandlers('before')
  const afterHandlers = makeHandlers('after')

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
      {beforeSections.map((s, i) => (
        <MenuSectionCard
          key={s.id}
          section={s}
          restaurantId={restaurantId}
          placement="before"
          isDragOver={beforeHandlers.dragOverIdx === i}
          onDragStart={() => beforeHandlers.onDragStart(i)}
          onDragOver={() => beforeHandlers.onDragOver(i)}
          onDragEnd={beforeHandlers.onDragEnd}
          onDrop={() => beforeHandlers.onDrop(i)}
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
      {afterSections.map((s, i) => (
        <MenuSectionCard
          key={s.id}
          section={s}
          restaurantId={restaurantId}
          placement="after"
          isDragOver={afterHandlers.dragOverIdx === i}
          onDragStart={() => afterHandlers.onDragStart(i)}
          onDragOver={() => afterHandlers.onDragOver(i)}
          onDragEnd={afterHandlers.onDragEnd}
          onDrop={() => afterHandlers.onDrop(i)}
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
  isDragOver,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  onRefresh,
}: {
  section: Section
  restaurantId: string
  placement: 'before' | 'after'
  isDragOver: boolean
  onDragStart: () => void
  onDragOver: () => void
  onDragEnd: () => void
  onDrop: () => void
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
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={e => { e.preventDefault(); onDragOver() }}
      onDragEnd={onDragEnd}
      onDrop={e => { e.preventDefault(); onDrop() }}
      className={`bg-zinc-900 border rounded-2xl overflow-hidden select-none transition-colors ${
        isDragOver ? 'border-orange-500/50 ring-1 ring-orange-500/30' : 'border-zinc-800'
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/60">
        <div className="text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing shrink-0">
          <svg className="w-3 h-4" viewBox="0 0 6 10" fill="currentColor">
            <circle cx="1.5" cy="1.5" r="1.2"/><circle cx="4.5" cy="1.5" r="1.2"/>
            <circle cx="1.5" cy="5" r="1.2"/><circle cx="4.5" cy="5" r="1.2"/>
            <circle cx="1.5" cy="8.5" r="1.2"/><circle cx="4.5" cy="8.5" r="1.2"/>
          </svg>
        </div>
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
      <div className="p-4" onDragStart={e => e.stopPropagation()}>
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
  const [uploadCount, setUploadCount] = useState(0)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imagesRef = useRef(images)
  imagesRef.current = images
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const dragIndex = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

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

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const valid = files.filter(f => f.size <= 500 * 1024)
    const skipped = files.length - valid.length
    if (valid.length === 0) { setError('Image(s) trop lourde(s) — max 500 Ko.'); return }
    if (skipped > 0) setError(`${skipped} fichier(s) ignoré(s) > 500 Ko.`)
    else setError(null)
    setUploadCount(valid.length)
    const newImgs: GalleryImage[] = []
    for (const file of valid) {
      const result = await uploadSectionImage(restaurantId, section.id, file)
      setUploadCount(prev => prev - 1)
      if (result.error) { setError(result.error); break }
      else if (result.url) newImgs.push({ url: result.url, caption: '' })
    }
    setUploadCount(0)
    if (newImgs.length) {
      const next = [...imagesRef.current, ...newImgs]
      setImages(next)
      doSave(next)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
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

  function onDragStart(e: React.DragEvent, i: number) {
    dragIndex.current = i
    e.dataTransfer.effectAllowed = 'move'
  }
  function onDragOver(e: React.DragEvent, i: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOver !== i) setDragOver(i)
  }
  function onDragEnd() { dragIndex.current = null; setDragOver(null) }
  function onDrop(e: React.DragEvent, i: number) {
    e.preventDefault()
    if (dragIndex.current === null || dragIndex.current === i) { setDragOver(null); return }
    const next = [...images]
    const [moved] = next.splice(dragIndex.current, 1)
    next.splice(i, 0, moved)
    setImages(next); setDragOver(null); dragIndex.current = null
    doSave(next)
  }

  return (
    <div className="space-y-2">
      {images.length === 0 && uploadCount === 0 && (
        <p className="text-xs text-zinc-600 text-center py-4">Aucune photo ajoutée</p>
      )}
      {images.map((img, i) => (
        <div
          key={img.url}
          draggable
          onDragStart={e => onDragStart(e, i)}
          onDragOver={e => onDragOver(e, i)}
          onDragEnd={onDragEnd}
          onDrop={e => onDrop(e, i)}
          className={`flex items-center gap-2.5 rounded-xl p-2 transition-colors select-none ${
            dragOver === i ? 'bg-orange-500/10 ring-1 ring-orange-500/40' : 'bg-zinc-800/50'
          }`}
        >
          <div className="text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing shrink-0 px-0.5">
            <svg className="w-3 h-4" viewBox="0 0 6 10" fill="currentColor">
              <circle cx="1.5" cy="1.5" r="1.2"/><circle cx="4.5" cy="1.5" r="1.2"/>
              <circle cx="1.5" cy="5" r="1.2"/><circle cx="4.5" cy="5" r="1.2"/>
              <circle cx="1.5" cy="8.5" r="1.2"/><circle cx="4.5" cy="8.5" r="1.2"/>
            </svg>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt="" className="w-14 h-10 object-cover rounded-lg shrink-0" />
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

      {uploadCount > 0 && Array.from({ length: uploadCount }).map((_, i) => (
        <div key={`ghost-${i}`} className="flex items-center gap-2.5 bg-zinc-800/30 rounded-xl p-2 animate-pulse">
          <div className="w-4 h-4 shrink-0" />
          <div className="w-14 h-10 bg-zinc-700 rounded-lg shrink-0" />
          <div className="flex-1 h-7 bg-zinc-700 rounded-lg" />
          <div className="w-7 h-7 rounded-lg bg-zinc-700 shrink-0" />
        </div>
      ))}

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadCount > 0}
          className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
        >
          {uploadCount > 0
            ? <span className="w-3 h-3 border-2 border-zinc-500 border-t-zinc-200 rounded-full animate-spin" />
            : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          }
          {uploadCount > 0 ? `${uploadCount} en cours…` : 'Ajouter des photos'}
        </button>
        <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFiles} />
        <p className="text-xs text-zinc-700">JPG, PNG, WebP · max 500 Ko</p>
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
