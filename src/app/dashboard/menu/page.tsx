import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { deleteCategory, deleteItem, updateItemFlags } from '@/app/actions/restaurant'
import { CATEGORY_TYPE_COLORS, CATEGORY_TYPES } from '@/lib/category-types'
import type { CategoryTypeId } from '@/lib/category-types'
import { IconTrash } from '@/components/icons'
import AddCategoryForm from '@/components/AddCategoryForm'
import AddItemModal from '@/components/AddItemModal'
import EditCategoryName from '@/components/EditCategoryName'
import EditItemModal from '@/components/EditItemModal'

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
  for (const val of Object.values(attrs)) {
    if (Array.isArray(val) && val.length > 0) parts.push(val.join(' · '))
    else if (typeof val === 'string' && val) parts.push(val)
  }
  return parts.length > 0 ? parts.join(' — ') : null
}

export default async function MenuPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  if (!restaurant) redirect('/dashboard/new')

  // Tentative avec toutes les colonnes — fallback si la migration n'est pas encore appliquée
  let categories: Category[] | null = null
  {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, position, category_type, items(id, name, description, price, happy_hour_price, allergens, is_available, is_vegetarian, is_vegan, image_url, attributes)')
      .eq('restaurant_id', restaurant.id)
      .order('position')

    if (!error) {
      categories = data as unknown as Category[]
    } else {
      // Fallback sans les colonnes optionnelles (migration non appliquée)
      const { data: fallback } = await supabase
        .from('categories')
        .select('id, name, position, items(id, name, description, price, allergens, is_available, is_vegetarian, is_vegan, image_url)')
        .eq('restaurant_id', restaurant.id)
        .order('position')
      categories = (fallback ?? []).map((c) => ({
        ...c,
        category_type: 'standard',
        items: ((c.items ?? []) as Item[]).map((i) => ({ ...i, happy_hour_price: null, attributes: null })),
      })) as Category[]
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Menu</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Gérez vos catégories et vos plats</p>
        </div>
      </div>

      {/* Bandeau IA teaser */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-violet-500/20 bg-violet-500/5 mb-6">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-violet-500/15 shrink-0">
          <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-violet-300">Génération de menu par IA — bientôt disponible</p>
          <p className="text-xs text-violet-400/60 mt-0.5">Décrivez votre restaurant et laissez l&apos;IA créer votre menu complet en quelques secondes.</p>
        </div>
        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border border-violet-500/30 text-violet-400 bg-violet-500/10">
          Bientôt
        </span>
      </div>

      {/* Ajouter une catégorie */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">Nouvelle catégorie</h2>
        <AddCategoryForm restaurantId={restaurant.id} />
      </div>

      {/* Liste des catégories */}
      {!categories || categories.length === 0 ? (
        <div className="text-center py-16 text-zinc-500 text-sm">
          Aucune catégorie — commencez par en créer une ci-dessus.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4 items-start">
          {(categories ?? []).map((cat) => {
            const catType = cat.category_type as CategoryTypeId
            const typeMeta = CATEGORY_TYPES.find((t) => t.id === catType) ?? CATEGORY_TYPES[0]
            const typeBadgeClass = CATEGORY_TYPE_COLORS[catType] ?? CATEGORY_TYPE_COLORS.standard

            return (
              <div key={cat.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                {/* Header catégorie */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg leading-none">{typeMeta.emoji}</span>
                    <EditCategoryName id={cat.id} name={cat.name} />
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeBadgeClass}`}>
                      {typeMeta.label}
                    </span>
                  </div>
                  <form action={deleteCategory}>
                    <input type="hidden" name="id" value={cat.id} />
                    <button
                      type="submit"
                      className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer rounded-lg hover:bg-red-400/10"
                      title="Supprimer la catégorie"
                    >
                      <IconTrash className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>

                {/* Plats */}
                <div className="divide-y divide-zinc-800">
                  {cat.items?.map((item) => {
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

                            <form action={updateItemFlags}>
                              <input type="hidden" name="id" value={item.id} />
                              <input type="hidden" name="field" value="is_vegetarian" />
                              <input type="hidden" name="value" value={(!item.is_vegetarian).toString()} />
                              <button type="submit" className={`text-xs px-2 py-0.5 rounded-full border transition-colors cursor-pointer shrink-0 ${item.is_vegetarian ? 'bg-lime-500/15 text-lime-400 border-lime-500/30 hover:opacity-60' : 'bg-transparent text-zinc-600 border-zinc-700 hover:text-lime-400 hover:border-lime-500/30'}`}>
                                🌿 Végé
                              </button>
                            </form>

                            <form action={updateItemFlags}>
                              <input type="hidden" name="id" value={item.id} />
                              <input type="hidden" name="field" value="is_vegan" />
                              <input type="hidden" name="value" value={(!item.is_vegan).toString()} />
                              <button type="submit" className={`text-xs px-2 py-0.5 rounded-full border transition-colors cursor-pointer shrink-0 ${item.is_vegan ? 'bg-pink-500/15 text-pink-400 border-pink-500/30 hover:opacity-60' : 'bg-transparent text-zinc-600 border-zinc-700 hover:text-pink-400 hover:border-pink-500/30'}`}>
                                🫘 Vegan
                              </button>
                            </form>

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
                            {item.happy_hour_price != null && (
                              <p className="text-xs text-amber-400 tabular-nums">{Number(item.happy_hour_price).toFixed(2)} € 🍹</p>
                            )}
                            <span className="text-sm font-semibold text-white tabular-nums">
                              {Number(item.price).toFixed(2)} €
                            </span>
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

                {/* Formulaire ajout plat */}
                <AddItemModal categoryId={cat.id} categoryType={catType} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
