import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveRestaurantId } from '@/lib/active-restaurant'
import MenuClientLayout from './MenuClientLayout'

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

export default async function MenuPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const activeRestaurantId = await getActiveRestaurantId(user.id)

  const { data: restaurant } = activeRestaurantId
    ? await supabase.from('restaurants').select('id, name, slug').eq('id', activeRestaurantId).maybeSingle()
    : { data: null }

  if (!restaurant) redirect('/dashboard/new')

  let categories: Category[] | null = null
  {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, position, category_type, items(id, name, description, price, happy_hour_price, allergens, is_available, is_vegetarian, is_vegan, image_url, attributes, sizes)')
      .eq('restaurant_id', restaurant.id)
      .order('position')

    if (!error) {
      categories = data as unknown as Category[]
    } else {
      const { data: fallback } = await supabase
        .from('categories')
        .select('id, name, position, items(id, name, description, price, allergens, is_available, is_vegetarian, is_vegan, image_url, sizes)')
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
    <MenuClientLayout
      categories={categories ?? []}
      restaurantId={restaurant.id}
      restaurantSlug={restaurant.slug}
    />
  )
}
