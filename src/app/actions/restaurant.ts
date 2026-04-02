'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// ─── Restaurant ───────────────────────────────────────────────
export async function createRestaurant(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = formData.get('name') as string
  const address = formData.get('address') as string
  const phone = formData.get('phone') as string
  const slug = slugify(name) + '-' + Math.random().toString(36).slice(2, 6)

  const { error } = await supabase.from('restaurants').insert({
    owner_id: user.id,
    name,
    slug,
    address: address || null,
    phone: phone || null,
  })

  if (error) redirect('/dashboard/new?error=1')
  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function updateRestaurant(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const address = formData.get('address') as string
  const phone = formData.get('phone') as string
  await supabase
    .from('restaurants')
    .update({ name, address: address || null, phone: phone || null })
    .eq('id', id)
    .eq('owner_id', user.id)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/settings')
}

export async function updateSchedules(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string

  // Horaires d'ouverture : opening_hours = { mon: { open: '12:00', close: '22:00', closed: false }, … }
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  const opening_hours: Record<string, { open: string; close: string; closed: boolean }> = {}
  for (const day of DAYS) {
    opening_hours[day] = {
      open: (formData.get(`oh_${day}_open_time`) as string) || '12:00',
      close: (formData.get(`oh_${day}_close`) as string) || '22:00',
      closed: formData.get(`oh_${day}_open`) !== '1',
    }
  }

  // Happy hour
  const happy_hour_enabled = formData.getAll('hh_enabled').includes('1')
  const happy_hour: { enabled: boolean; start: string; end: string; days: string[] } = {
    enabled: happy_hour_enabled,
    start: (formData.get('hh_start') as string) || '17:00',
    end: (formData.get('hh_end') as string) || '19:00',
    days: DAYS.filter((d) => formData.get(`hh_day_${d}`) === '1'),
  }

  await supabase
    .from('restaurants')
    .update({ opening_hours, happy_hour })
    .eq('id', id)
    .eq('owner_id', user.id)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/settings/schedules')
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const full_name = (formData.get('full_name') as string)?.trim()
  let avatar_url: string | undefined

  const avatarFile = formData.get('avatar') as File | null
  if (avatarFile && avatarFile.size > 0) {
    const ext = avatarFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${user.id}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, avatarFile, { contentType: avatarFile.type, cacheControl: '3600', upsert: true })
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      avatar_url = urlData.publicUrl + '?t=' + Date.now()
    }
  }

  const update: Record<string, unknown> = {}
  if (full_name) update.full_name = full_name
  if (avatar_url) update.avatar_url = avatar_url

  if (Object.keys(update).length > 0) {
    await supabase.from('profiles').update(update).eq('id', user.id)
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/settings')
}

// ─── Categories ───────────────────────────────────────────────
export async function createCategory(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const restaurant_id = formData.get('restaurant_id') as string
  const name = formData.get('name') as string

  const { data: existing } = await supabase
    .from('categories')
    .select('position')
    .eq('restaurant_id', restaurant_id)
    .order('position', { ascending: false })
    .limit(1)

  const position = existing && existing.length > 0 ? existing[0].position + 1 : 0
  const category_type = (formData.get('category_type') as string) || 'standard'

  await supabase.from('categories').insert({ restaurant_id, name, position, category_type })
  revalidatePath('/dashboard/menu')
}

export async function deleteCategory(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  await supabase.from('categories').delete().eq('id', id)
  revalidatePath('/dashboard/menu')
}

export async function updateCategory(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const name = formData.get('name') as string
  if (!name?.trim()) return
  await supabase.from('categories').update({ name: name.trim() }).eq('id', id)
  revalidatePath('/dashboard/menu')
}

// ─── Items ────────────────────────────────────────────────────
export async function createItem(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const category_id = formData.get('category_id') as string
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const price = parseFloat(formData.get('price') as string)
  const happy_hour_price_raw = formData.get('happy_hour_price') as string
  const happy_hour_price = happy_hour_price_raw ? parseFloat(happy_hour_price_raw) : null
  const allergens = ((formData.get('allergens') as string) || '')
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)

  const is_vegetarian = formData.has('is_vegetarian')
  const is_vegan = formData.has('is_vegan')

  // Attributs spécifiques au type : tout ce qui n'est pas un champ standard
  const STANDARD_KEYS = new Set(['category_id', 'name', 'description', 'price', 'happy_hour_price', 'happy_hour_price', 'allergens', 'is_vegetarian', 'is_vegan', 'image'])
  const attributes: Record<string, string | string[]> = {}
  for (const [key, value] of formData.entries()) {
    if (STANDARD_KEYS.has(key) || typeof value !== 'string') continue
    const existing = attributes[key]
    if (existing === undefined) {
      attributes[key] = value
    } else if (Array.isArray(existing)) {
      existing.push(value)
    } else {
      attributes[key] = [existing, value]
    }
  }

  // Upload image vers Supabase Storage (bucket 'item-images' doit exister)
  let image_url: string | null = null
  const imageFile = formData.get('image') as File | null
  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('item-images')
      .upload(path, imageFile, { contentType: imageFile.type, cacheControl: '3600' })
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(path)
      image_url = urlData.publicUrl
    }
  }

  await supabase.from('items').insert({
    category_id,
    name,
    description: description || null,
    price,
    happy_hour_price,
    allergens,
    is_vegetarian,
    is_vegan,
    attributes: Object.keys(attributes).length > 0 ? attributes : {},
    image_url,
  })

  revalidatePath('/dashboard/menu')
}

export async function updateItem(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const price = parseFloat(formData.get('price') as string)
  const happy_hour_price_raw = formData.get('happy_hour_price') as string
  const happy_hour_price = happy_hour_price_raw ? parseFloat(happy_hour_price_raw) : null
  const allergens = ((formData.get('allergens') as string) || '')
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)
  const is_vegetarian = formData.has('is_vegetarian')
  const is_vegan = formData.has('is_vegan')

  const STANDARD_KEYS = new Set(['id', 'name', 'description', 'price', 'happy_hour_price', 'allergens', 'is_vegetarian', 'is_vegan', 'image'])
  const attributes: Record<string, string | string[]> = {}
  for (const [key, value] of formData.entries()) {
    if (STANDARD_KEYS.has(key) || typeof value !== 'string') continue
    const existing = attributes[key]
    if (existing === undefined) {
      attributes[key] = value
    } else if (Array.isArray(existing)) {
      existing.push(value)
    } else {
      attributes[key] = [existing, value]
    }
  }

  // Upload nouvelle image si fournie
  let image_url: string | undefined = undefined
  const imageFile = formData.get('image') as File | null
  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('item-images')
      .upload(path, imageFile, { contentType: imageFile.type, cacheControl: '3600' })
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(path)
      image_url = urlData.publicUrl
    }
  }

  const updatePayload: Record<string, unknown> = {
    name,
    description: description || null,
    price,
    happy_hour_price,
    allergens,
    is_vegetarian,
    is_vegan,
    attributes,
  }
  if (image_url !== undefined) updatePayload.image_url = image_url

  await supabase.from('items').update(updatePayload).eq('id', id)
  revalidatePath('/dashboard/menu')
}

export async function updateItemFlags(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const field = formData.get('field') as string
  const value = formData.get('value') === 'true'
  if (!['is_vegetarian', 'is_vegan', 'is_available'].includes(field)) return
  await supabase.from('items').update({ [field]: value }).eq('id', id)
  revalidatePath('/dashboard/menu')
}

export async function updateItemAvailability(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const is_available = formData.get('is_available') === 'true'
  await supabase.from('items').update({ is_available }).eq('id', id)
  revalidatePath('/dashboard/menu')
}

export async function deleteItem(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  await supabase.from('items').delete().eq('id', id)
  revalidatePath('/dashboard/menu')
}

// ─── Tables ───────────────────────────────────────────────────
export async function createTable(formData: FormData) {
  const supabase = await createClient()
  const restaurant_id = formData.get('restaurant_id') as string
  const number = parseInt(formData.get('number') as string)
  const label = formData.get('label') as string

  await supabase.from('tables').insert({
    restaurant_id,
    number,
    label: label || null,
  })

  revalidatePath('/dashboard/tables')
}

export async function deleteTable(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  await supabase.from('tables').delete().eq('id', id)
  revalidatePath('/dashboard/tables')
}

// ─── Orders ───────────────────────────────────────────────────
export async function updateOrderStatus(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  const status = formData.get('status') as string

  const VALID_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'done', 'cancelled']
  if (!VALID_STATUSES.includes(status)) return

  // Vérifie que la commande appartient bien au restaurant de l'utilisateur
  const { data: order } = await supabase
    .from('orders')
    .select('id, restaurant_id')
    .eq('id', id)
    .single()
  if (!order) return

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', order.restaurant_id)
    .eq('owner_id', user.id)
    .single()
  if (!restaurant) return

  await supabase.from('orders').update({ status }).eq('id', id)
  revalidatePath('/dashboard/orders')
}

// ─── Public order placement ───────────────────────────────────

type HHData = { enabled: boolean; start: string; end: string; days: string[] }

function checkHHActive(hh: HHData | null): boolean {
  if (!hh?.enabled) return false
  const KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const dayKey = KEYS[new Date().getDay()]
  if (!hh.days.includes(dayKey)) return false
  const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const now = new Date().getHours() * 60 + new Date().getMinutes()
  return now >= toMins(hh.start) && now < toMins(hh.end)
}

export async function placeOrder(payload: {
  restaurantId: string
  tableId: string | null
  items: Array<{ itemId: string; quantity: number }>
  note: string
}): Promise<{ success: true; orderId: string } | { success: false; error: string }> {
  // Validate input
  if (!payload.restaurantId || !Array.isArray(payload.items) || payload.items.length === 0) {
    return { success: false, error: 'Panier vide ou données invalides' }
  }
  const UUID_RE = /^[0-9a-f-]{36}$/i
  if (!UUID_RE.test(payload.restaurantId)) return { success: false, error: 'Données invalides' }
  for (const item of payload.items) {
    if (!UUID_RE.test(item.itemId) || item.quantity < 1 || item.quantity > 99) {
      return { success: false, error: 'Données invalides' }
    }
  }

  const supabase = await createClient()

  // Verify restaurant exists + get HH config
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, happy_hour')
    .eq('id', payload.restaurantId)
    .single()
  if (!restaurant) return { success: false, error: 'Restaurant introuvable' }

  const isHH = checkHHActive(restaurant.happy_hour as HHData | null)

  // Fetch items from DB — never trust client-supplied prices
  const itemIds = payload.items.map(i => i.itemId)
  const { data: dbItems } = await supabase
    .from('items')
    .select('id, price, happy_hour_price, is_available, category_id')
    .in('id', itemIds)

  if (!dbItems || dbItems.length !== itemIds.length) {
    return { success: false, error: 'Certains articles sont introuvables' }
  }

  // Verify all items belong to this restaurant via categories
  const catIds = [...new Set(dbItems.map(i => i.category_id))]
  const { data: cats } = await supabase
    .from('categories')
    .select('id')
    .in('id', catIds)
    .eq('restaurant_id', payload.restaurantId)
  if (!cats || cats.length !== catIds.length) {
    return { success: false, error: 'Articles invalides' }
  }

  if (dbItems.some(i => !i.is_available)) {
    return { success: false, error: 'Certains articles ne sont plus disponibles' }
  }

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      restaurant_id: payload.restaurantId,
      table_id: payload.tableId ?? null,
      status: 'pending',
      payment_status: 'unpaid',
      customer_note: payload.note.trim() || null,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    return { success: false, error: 'Erreur lors de la création de la commande' }
  }

  // Insert order_items with server-verified prices
  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(
      payload.items.map(pi => {
        const dbItem = dbItems.find(i => i.id === pi.itemId)!
        const unitPrice = isHH && dbItem.happy_hour_price != null
          ? Number(dbItem.happy_hour_price)
          : Number(dbItem.price)
        return { order_id: order.id, item_id: pi.itemId, quantity: pi.quantity, unit_price: unitPrice }
      })
    )

  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order.id)
    return { success: false, error: "Erreur lors de l'enregistrement des articles" }
  }

  revalidatePath('/dashboard/orders')
  return { success: true, orderId: order.id }
}
