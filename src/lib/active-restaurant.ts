import { cookies } from 'next/headers'
import { createClient } from './supabase/server'

export const ACTIVE_RESTAURANT_COOKIE = 'active_restaurant_id'

export type RestaurantSummary = {
  id: string
  name: string
  slug: string
}

/**
 * Retourne l'ID du restaurant actif (depuis le cookie).
 * Valide que le restaurant appartient bien à l'utilisateur.
 * Fallback sur le premier restaurant si le cookie est invalide/absent.
 */
export async function getActiveRestaurantId(userId: string): Promise<string | null> {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const cookieId = cookieStore.get(ACTIVE_RESTAURANT_COOKIE)?.value

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })

  if (!restaurants || restaurants.length === 0) return null

  if (cookieId && restaurants.some((r) => r.id === cookieId)) {
    return cookieId
  }

  return restaurants[0].id
}

/**
 * Retourne tous les restaurants de l'utilisateur + l'ID actif.
 */
export async function getRestaurantsWithActive(userId: string): Promise<{
  restaurants: RestaurantSummary[]
  activeId: string | null
}> {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const cookieId = cookieStore.get(ACTIVE_RESTAURANT_COOKIE)?.value

  const { data } = await supabase
    .from('restaurants')
    .select('id, name, slug')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })

  const restaurants = (data ?? []) as RestaurantSummary[]
  if (restaurants.length === 0) return { restaurants: [], activeId: null }

  const activeId =
    cookieId && restaurants.some((r) => r.id === cookieId)
      ? cookieId
      : restaurants[0].id

  return { restaurants, activeId }
}
