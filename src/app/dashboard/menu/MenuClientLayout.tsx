'use client'

import { useState } from 'react'
import { deleteCategory, deleteItem, updateItemFlags } from '@/app/actions/restaurant'
import { CATEGORY_TYPE_COLORS, CATEGORY_TYPES } from '@/lib/category-types'
import type { CategoryTypeId } from '@/lib/category-types'
import { IconTrash, IconPlus } from '@/components/icons'
import AddCategoryForm from '@/components/AddCategoryForm'
import AddItemModal from '@/components/AddItemModal'
import EditCategoryName from '@/components/EditCategoryName'
import EditItemModal from '@/components/EditItemModal'
import MenuScanButton from './MenuScanButton'
import PageTutorial, { type PageTutorialStep } from '@/components/PageTutorial'

const MENU_TUTORIAL_STEPS: PageTutorialStep[] = [
  {
    selector: '[data-page-tutorial="menu-scan"]',
    emoji: '✨',
    title: 'Importez votre menu en 10 secondes',
    description:
      'Photographiez votre menu papier. Qomand l’IA crée automatiquement toutes vos catégories et tous vos plats. Vous n’avez plus qu’à vérifier.',
  },
  {
    selector: '[data-page-tutorial="menu-cat-nav"]',
    emoji: '📂',
    title: 'Vos catégories',
    description:
      'Chaque catégorie a un type (pizzas, viandes, boissons…). Cliquez dessus pour voir et modifier ses plats. Vous pouvez en créer autant que vous voulez.',
  },
  {
    selector: '[data-page-tutorial="menu-cat-add"]',
    emoji: '➕',
    title: 'Créez une catégorie',
    description:
      'Donnez un nom et choisissez un type. Le type détermine les champs disponibles : degré d’alcool, labels végétarien / vegan, tailles avec prix par déclinaison.',
  },
  {
    selector: '[data-page-tutorial="menu-content"]',
    emoji: '🍽️',
    title: 'Gérez vos plats',
    description:
      'Ajoutez des plats avec photo, description, prix et variantes de taille (ex : pizza 26 cm / 33 cm). Activez ou désactivez chaque plat selon votre stock.',
  },
]

type Attributes = Record<string, string | string[]>

type Item = {
  id: string
  name: string
  description: string | null
  price: number
  happy_hour_price: number | null
  allergens: string[]
  is_available: boolean
  is_vegetarian: boolean
  is_vegan: boolean
  image_url: string | null
  attributes: Attributes | null
  sizes: { label: string; price: number }[] | null
}

type Category = {
  id: string
  name: string
  position: number
  category_type: string
  items: Item[]
}

function formatAttributes(attrs: Attributes | null): string | null {
  if (!attrs || Object.keys(attrs).length === 0) return null
  const parts: string[] = []
  for (const [key, val] of Object.entries(attrs)) {
    if (Array.isArray(val) && val.length > 0) parts.push(val.join(' · '))
    else if (typeof val === 'string' && val) {
      parts.push(key === 'degre' ? `${val}°` : val)
    }
  }
  return parts.length > 0 ? parts.join(' — ') : null
}

export default function MenuClientLayout({
  categories,
  restaurantId,
  restaurantSlug,
}: {
  categories: Category[]
  restaurantId: string
  restaurantSlug: string
}) {
  const [selectedId, setSelectedId] = useState<string | null>(categories[0]?.id ?? null)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [showCategorySelector, setShowCategorySelector] = useState(false)

  const selected = categories.find((c) => c.id === selectedId) ?? null
  const catType = (selected?.category_type ?? 'standard') as CategoryTypeId
  const typeMeta = CATEGORY_TYPES.find((t) => t.id === catType) ?? CATEGORY_TYPES[0]
  const typeBadgeClass = CATEGORY_TYPE_COLORS[catType] ?? CATEGORY_TYPE_COLORS.standard

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Menu</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Gérez vos catégories et vos plats</p>
        </div>
        <div data-page-tutorial="menu-scan">
          <MenuScanButton restaurantId={restaurantId} />
        </div>
      </div>

      {/* Sélecteur de catégorie mobile */}
      <div className="md:hidden mb-6 relative">
        {/* Overlay */}
        {showCategorySelector && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowCategorySelector(false)}
          />
        )}
        
        <button
          onClick={() => setShowCategorySelector(!showCategorySelector)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-left relative z-50"
        >
          {selected ? (
            <div className="flex items-center gap-2.5">
              <span className="text-base leading-none">{typeMeta.emoji}</span>
              <span className="text-sm font-medium truncate">{selected.name}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeBadgeClass}`}>
                {typeMeta.label}
              </span>
            </div>
          ) : (
            <span className="text-sm text-zinc-400">Sélectionnez une catégorie</span>
          )}
          <svg
            className={`w-5 h-5 text-zinc-400 transition-transform ${showCategorySelector ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {/* Dropdown des catégories */}
        {showCategorySelector && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl p-2 max-h-80 overflow-y-auto z-50 shadow-2xl">
            {categories.map((cat) => {
              const ct = cat.category_type as CategoryTypeId
              const meta = CATEGORY_TYPES.find((t) => t.id === ct) ?? CATEGORY_TYPES[0]
              const isActive = cat.id === selectedId
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedId(cat.id)
                    setShowCategorySelector(false)
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                    isActive
                      ? 'bg-white/8 text-white font-medium'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <span className="text-base leading-none shrink-0">{meta.emoji}</span>
                  <span className="truncate flex-1">{cat.name}</span>
                  <span className="shrink-0 text-[10px] text-zinc-500 tabular-nums">
                    {cat.items?.length ?? 0}
                  </span>
                </button>
              )
            })}

            {/* Ajouter une catégorie dans le dropdown */}
            <button
              onClick={() => {
                setShowAddCategory(true)
                setShowCategorySelector(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 transition-colors border border-dashed border-zinc-800 hover:border-zinc-700 mt-2"
            >
              <IconPlus className="w-3.5 h-3.5 shrink-0" />
              Nouvelle catégorie
            </button>
          </div>
        )}

        {/* Formulaire d'ajout de catégorie mobile */}
        {showAddCategory && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowAddCategory(false)}
            />
            <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl p-3 z-50 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-zinc-300">Nouvelle catégorie</p>
              <button
                onClick={() => setShowAddCategory(false)}
                className="text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <AddCategoryForm restaurantId={restaurantId} />
          </div>
          </>
        )}
      </div>

      <div className="flex gap-6 items-start">
        {/* ── Colonne gauche : liste des catégories (Desktop uniquement) ── */}
        <nav className="hidden md:block w-48 shrink-0" data-page-tutorial="menu-cat-nav">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 px-3 mb-2">
            Catégories
          </p>

          <ul className="space-y-0.5">
            {categories.map((cat) => {
              const ct = cat.category_type as CategoryTypeId
              const meta = CATEGORY_TYPES.find((t) => t.id === ct) ?? CATEGORY_TYPES[0]
              const isActive = cat.id === selectedId
              return (
                <li key={cat.id}>
                  <button
                    onClick={() => setSelectedId(cat.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                      isActive
                        ? 'bg-white/8 text-white font-medium'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    <span className="text-base leading-none shrink-0">{meta.emoji}</span>
                    <span className="truncate flex-1">{cat.name}</span>
                    <span className="shrink-0 text-[10px] text-zinc-500 tabular-nums">
                      {cat.items?.length ?? 0}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          {/* Ajouter une catégorie */}
          <div className="mt-2">
            {!showAddCategory ? (
              <button
                data-page-tutorial="menu-cat-add"
                onClick={() => setShowAddCategory(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 transition-colors border border-dashed border-zinc-800 hover:border-zinc-700 mt-1"
              >
                <IconPlus className="w-3.5 h-3.5 shrink-0" />
                Nouvelle catégorie
              </button>
            ) : (
              <div className="mt-2 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-zinc-300">Nouvelle catégorie</p>
                  <button
                    onClick={() => setShowAddCategory(false)}
                    className="text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <AddCategoryForm restaurantId={restaurantId} />
              </div>
            )}
          </div>
        </nav>

        {/* ── Colonne droite : contenu de la catégorie ── */}
        <div className="flex-1 min-w-0 bg-white/[0.03] border border-white/[0.06] rounded-2xl" data-page-tutorial="menu-content">
          {!selected ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-zinc-400">Sélectionnez une catégorie</p>
              <p className="text-xs text-zinc-600 mt-1">Cliquez sur une catégorie à gauche pour voir ses plats</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl">
              {/* Header catégorie */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl leading-none">{typeMeta.emoji}</span>
                  <EditCategoryName id={selected.id} name={selected.name} />
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeBadgeClass}`}>
                    {typeMeta.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <form action={deleteCategory}>
                    <input type="hidden" name="id" value={selected.id} />
                    <button
                      type="submit"
                      className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer rounded-lg hover:bg-red-400/10"
                      title="Supprimer la catégorie"
                    >
                      <IconTrash className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>

              {/* Plats */}
              {selected.items?.length === 0 ? (
                <div className="px-5 py-8 flex flex-col items-center gap-3">
                  <p className="text-sm text-zinc-600">Aucun plat dans cette catégorie</p>
                  <AddItemModal categoryId={selected.id} categoryType={catType} />
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {selected.items?.map((item) => {
                    const attrText = formatAttributes(item.attributes)
                    return (
                      <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                        {/* Thumbnail */}
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 text-base">
                            {typeMeta.emoji}
                          </div>
                        )}

                        {/* Infos */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-white truncate">{item.name}</span>
                            {item.is_vegetarian && (
                              <form action={updateItemFlags}>
                                <input type="hidden" name="id" value={item.id} />
                                <input type="hidden" name="field" value="is_vegetarian" />
                                <input type="hidden" name="value" value="false" />
                                <button type="submit" className="text-xs px-2 py-0.5 rounded-full border transition-colors cursor-pointer shrink-0 bg-lime-500/15 text-lime-400 border-lime-500/30 hover:opacity-60">
                                  🌿 Végé
                                </button>
                              </form>
                            )}
                            {item.is_vegan && (
                              <form action={updateItemFlags}>
                                <input type="hidden" name="id" value={item.id} />
                                <input type="hidden" name="field" value="is_vegan" />
                                <input type="hidden" name="value" value="false" />
                                <button type="submit" className="text-xs px-2 py-0.5 rounded-full border transition-colors cursor-pointer shrink-0 bg-pink-500/15 text-pink-400 border-pink-500/30 hover:opacity-60">
                                  🫘 Vegan
                                </button>
                              </form>
                            )}
                            {!item.is_available && (
                              <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full shrink-0">Indispo</span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-zinc-400 truncate mt-0.5">{item.description}</p>
                          )}
                          {attrText && (
                            <p className="text-xs text-zinc-500 mt-0.5">{attrText}</p>
                          )}
                          {item.allergens?.length > 0 && (
                            <p className="text-xs text-zinc-600 mt-0.5">{item.allergens.join(', ')}</p>
                          )}
                        </div>

                        {/* Prix + actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            {item.sizes && item.sizes.length > 0 ? (
                              <span className="text-sm font-semibold text-white tabular-nums">
                                dès {Math.min(...item.sizes.map(s => s.price)).toFixed(2)} €
                              </span>
                            ) : (
                              <>
                                {item.happy_hour_price != null && (
                                  <p className="text-xs text-amber-400 tabular-nums">{Number(item.happy_hour_price).toFixed(2)} € 🍹</p>
                                )}
                                <span className="text-sm font-semibold text-white tabular-nums">
                                  {Number(item.price).toFixed(2)} €
                                </span>
                              </>
                            )}
                          </div>
                          <EditItemModal item={item} categoryType={catType} />
                          <form action={updateItemFlags}>
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="field" value="is_available" />
                            <input type="hidden" name="value" value={(!item.is_available).toString()} />
                            <button type="submit" className="text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-2 py-1 rounded-lg transition-colors cursor-pointer">
                              {item.is_available ? 'Désactiver' : 'Activer'}
                            </button>
                          </form>
                          <form action={deleteItem}>
                            <input type="hidden" name="id" value={item.id} />
                            <button type="submit" className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer rounded-lg hover:bg-red-400/10" title="Supprimer">
                              <IconTrash className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Ligne d'ajout inline */}
              {(selected.items?.length ?? 0) > 0 && (
                <div className="px-5 py-3 border-t border-white/[0.04]">
                  <AddItemModal categoryId={selected.id} categoryType={catType} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bannière aperçu menu */}
      <div className="mt-8 relative rounded-2xl overflow-hidden" style={{ minHeight: 200 }}>
        {/* Image de fond */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/menubg.webp"
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Dégradé : opaque à gauche, transparent à droite */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/10" />

        {/* Contenu */}
        <div className="relative z-10 px-10 py-10 flex flex-col gap-4 max-w-lg">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Aperçu client</p>
          <h2 className="text-3xl font-bold text-white leading-tight">
            Découvrez votre menu
          </h2>
          <p className="text-sm text-zinc-300">
            Prévisualisez l'expérience de commande en temps réel.
          </p>
          <a
            href={`/menu/${restaurantSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors w-fit"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.573-3.007-9.964-7.178Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            Découvrez votre menu
          </a>
        </div>
      </div>

      <PageTutorial steps={MENU_TUTORIAL_STEPS} storageKey="tutorial_page_menu_v1" />
    </div>
  )
}
