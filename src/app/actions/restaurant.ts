'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ACTIVE_RESTAURANT_COOKIE } from '@/lib/active-restaurant'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { renderOrderEmail, renderPickupReadyEmail } from '@/lib/email-template'

const resend = process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('votre_cle')
  ? new Resend(process.env.RESEND_API_KEY)
  : null

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// ─── Restaurant ───────────────────────────────────────────────
type CreateRestaurantState = { error?: string | null; success?: boolean }

type OpeningHours = Record<string, { open: string; close: string; closed: boolean }>

export async function createRestaurantFull(payload: {
  name: string
  address?: string
  phone?: string
  paymentMethods: string[]
  fulfillmentModes: string[]
  openingHours: OpeningHours
  happyHour: { enabled: boolean; start: string; end: string; days: string[] }
}): Promise<{ error?: string; restaurantId?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = payload.name?.trim()
  if (!name) return { error: 'Le nom du restaurant est requis.' }

  const slug = slugify(name) + '-' + Math.random().toString(36).slice(2, 6)

  const { data, error } = await supabase.from('restaurants').insert({
    owner_id: user.id,
    name,
    slug,
    address: payload.address || null,
    phone: payload.phone || null,
    accepted_payment_methods: payload.paymentMethods,
    fulfillment_modes: payload.fulfillmentModes,
    opening_hours: payload.openingHours,
    happy_hour: payload.happyHour,
  }).select('id').single()

  if (error) return { error: 'Impossible de créer le restaurant. Réessayez.' }

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_RESTAURANT_COOKIE, data.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })

  // Pas de revalidatePath ici — ça déclencherait un router.refresh() côté client
  // qui remonterait le wizard et réinitialiserait le state. La navigation
  // vers /dashboard après la step Stripe suffit à charger les données fraîches.
  return { restaurantId: data.id }
}

export async function createRestaurant(
  _prevState: CreateRestaurantState,
  formData: FormData,
): Promise<CreateRestaurantState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Le nom du restaurant est requis.' }

  const address = formData.get('address') as string
  const phone = formData.get('phone') as string
  const slug = slugify(name) + '-' + Math.random().toString(36).slice(2, 6)

  const { data, error } = await supabase.from('restaurants').insert({
    owner_id: user.id,
    name,
    slug,
    address: address || null,
    phone: phone || null,
  }).select('id').single()

  if (error) return { error: 'Impossible de créer le restaurant. Réessayez.' }

  // Activer automatiquement le nouveau restaurant
  if (data?.id) {
    const cookieStore = await cookies()
    cookieStore.set(ACTIVE_RESTAURANT_COOKIE, data.id, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function setActiveRestaurant(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const id = formData.get('id') as string
  // Vérifier que le restaurant appartient à l'utilisateur
  const { data } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (!data) return

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_RESTAURANT_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })

  revalidatePath('/dashboard', 'layout')
}

export async function deleteRestaurant(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string

  // Vérifier propriété avant suppression
  const { data } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (!data) return

  await supabase.from('restaurants').delete().eq('id', id)

  // Effacer le cookie si c'était le restaurant actif
  const cookieStore = await cookies()
  if (cookieStore.get(ACTIVE_RESTAURANT_COOKIE)?.value === id) {
    cookieStore.delete(ACTIVE_RESTAURANT_COOKIE)
  }

  revalidatePath('/dashboard', 'layout')
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

export async function updatePaymentMethods(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  const methods: string[] = []
  if (formData.get('online') === '1') methods.push('online')
  if (formData.get('cash') === '1') methods.push('cash')
  if (methods.length === 0) return // Au moins une méthode requise

  await supabase
    .from('restaurants')
    .update({ accepted_payment_methods: methods })
    .eq('id', id)
    .eq('owner_id', user.id)

  revalidatePath('/dashboard/settings/restaurant')
  redirect('/dashboard/settings/restaurant?saved=payment')
}

export async function updateFulfillmentModes(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  const modes: string[] = []
  if (formData.get('table') === '1') modes.push('table')
  if (formData.get('pickup') === '1') modes.push('pickup')
  if (modes.length === 0) return // Au moins un mode requis

  await supabase
    .from('restaurants')
    .update({ fulfillment_modes: modes })
    .eq('id', id)
    .eq('owner_id', user.id)

  revalidatePath('/dashboard/settings/restaurant')
  redirect('/dashboard/settings/restaurant?saved=fulfillment')
}

export async function updateAppearance(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  const brand_color = (formData.get('brand_color') as string) || '#f97316'
  const menu_button_radius = (formData.get('menu_button_radius') as string) || 'rounded'
  const menu_header_style = (formData.get('menu_header_style') as string) || 'dark'

  // Validation hex color
  if (!/^#[0-9a-fA-F]{6}$/.test(brand_color)) return

  await supabase
    .from('restaurants')
    .update({ brand_color, menu_button_radius, menu_header_style })
    .eq('id', id)
    .eq('owner_id', user.id)

  revalidatePath('/dashboard/settings/restaurant')
  redirect('/dashboard/settings/restaurant?saved=appearance')
}

export async function updateCoverImage(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  const coverFile = formData.get('cover') as File | null

  if (coverFile && coverFile.size > 0) {
    const ext = coverFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${id}/cover.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('restaurant-covers')
      .upload(path, coverFile, { contentType: coverFile.type, cacheControl: '3600', upsert: true })
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('restaurant-covers').getPublicUrl(path)
      const cover_image_url = urlData.publicUrl + '?t=' + Date.now()
      await supabase
        .from('restaurants')
        .update({ cover_image_url })
        .eq('id', id)
        .eq('owner_id', user.id)
    }
  }

  revalidatePath('/dashboard/settings/restaurant')
  redirect('/dashboard/settings/restaurant?saved=cover')
}

export async function updateWebsiteContent(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  const about_description = (formData.get('about_description') as string) || null
  const contact_phone = (formData.get('contact_phone') as string) || null
  const contact_email = (formData.get('contact_email') as string) || null
  const contact_address = (formData.get('contact_address') as string) || null

  // Membres de l'équipe : tableau JSON encodé dans le form
  let team_members: { name: string; role: string; bio: string }[] = []
  try {
    const raw = formData.get('team_members') as string
    if (raw) team_members = JSON.parse(raw)
  } catch { /* ignore */ }

  // Upload photo À propos
  let about_image_url: string | undefined
  const aboutFile = formData.get('about_image') as File | null
  if (aboutFile && aboutFile.size > 0) {
    const ext = aboutFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${id}/about.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('restaurant-covers')
      .upload(path, aboutFile, { contentType: aboutFile.type, cacheControl: '3600', upsert: true })
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('restaurant-covers').getPublicUrl(path)
      about_image_url = urlData.publicUrl + '?t=' + Date.now()
    }
  }

  const update: Record<string, unknown> = {
    about_description,
    contact_phone,
    contact_email,
    contact_address,
    team_members,
  }
  if (about_image_url) update.about_image_url = about_image_url

  await supabase
    .from('restaurants')
    .update(update)
    .eq('id', id)
    .eq('owner_id', user.id)

  revalidatePath('/dashboard/website')
  redirect('/dashboard/website?saved=1')
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
  const urgency_threshold = parseInt(formData.get('urgency_threshold') as string) || 5
  const happy_hour: { enabled: boolean; start: string; end: string; days: string[]; urgency_threshold: number } = {
    enabled: happy_hour_enabled,
    start: (formData.get('hh_start') as string) || '17:00',
    end: (formData.get('hh_end') as string) || '19:00',
    days: DAYS.filter((d) => formData.get(`hh_day_${d}`) === '1'),
    urgency_threshold,
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

// ─── Import IA ────────────────────────────────────────────────
export type BulkImportCategory = {
  name: string
  category_type: string
  items: {
    name: string
    description: string
    price: number
  }[]
}

export async function bulkImportMenu(
  restaurantId: string,
  categories: BulkImportCategory[],
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // Vérifier que le restaurant appartient à l'utilisateur
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', restaurantId)
    .eq('owner_id', user.id)
    .single()
  if (!restaurant) return { error: 'Restaurant introuvable' }

  // Position de départ (après les catégories existantes)
  const { data: existing } = await supabase
    .from('categories')
    .select('position')
    .eq('restaurant_id', restaurantId)
    .order('position', { ascending: false })
    .limit(1)
  let nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0

  for (const cat of categories) {
    const { data: newCat, error: catError } = await supabase
      .from('categories')
      .insert({
        restaurant_id: restaurantId,
        name: cat.name,
        position: nextPosition++,
        category_type: cat.category_type || 'standard',
      })
      .select('id')
      .single()

    if (catError || !newCat) continue

    const itemsToInsert = cat.items.map((item) => ({
      category_id: newCat.id,
      name: item.name,
      description: item.description || null,
      price: item.price,
      is_available: true,
      is_vegetarian: false,
      is_vegan: false,
      allergens: [],
    }))

    if (itemsToInsert.length > 0) {
      await supabase.from('items').insert(itemsToInsert)
    }
  }

  revalidatePath('/dashboard/menu')
  return {}
}

// ─── Tables ───────────────────────────────────────────────────
export async function createTable(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const restaurant_id = formData.get('restaurant_id') as string
  const zone = (formData.get('zone') as string) || null
  const numberRaw = formData.get('number') as string

  let number: number
  if (numberRaw && numberRaw.trim() !== '') {
    number = parseInt(numberRaw)
    if (isNaN(number) || number < 1) return { error: 'Numéro invalide' }
    // Vérifier l'unicité
    const { data: existing } = await supabase
      .from('tables')
      .select('id')
      .eq('restaurant_id', restaurant_id)
      .eq('number', number)
      .maybeSingle()
    if (existing) return { error: `La table n°${number} existe déjà` }
  } else {
    // Numéro auto = max existant + 1
    const { data: maxRow } = await supabase
      .from('tables')
      .select('number')
      .eq('restaurant_id', restaurant_id)
      .order('number', { ascending: false })
      .limit(1)
      .maybeSingle()
    number = (maxRow?.number ?? 0) + 1
  }

  const { count } = await supabase
    .from('tables')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurant_id)
  const i = count ?? 0
  const pos_x = 50 + (i % 5) * 160
  const pos_y = 50 + Math.floor(i / 5) * 120

  const floor = parseInt((formData.get('floor') as string) || '0', 10)

  await supabase.from('tables').insert({
    restaurant_id,
    number,
    label: zone,
    floor,
    pos_x,
    pos_y,
  })

  revalidatePath('/dashboard/tables')
  return {}
}

export async function bulkCreateTables(formData: FormData) {
  const supabase = await createClient()
  const restaurant_id = formData.get('restaurant_id') as string
  const zone = (formData.get('zone') as string) || null
  const countRaw = parseInt(formData.get('count') as string)
  const count = Math.min(Math.max(2, isNaN(countRaw) ? 2 : countRaw), 50)

  const { data: maxRow } = await supabase
    .from('tables')
    .select('number')
    .eq('restaurant_id', restaurant_id)
    .order('number', { ascending: false })
    .limit(1)
    .maybeSingle()
  const baseNumber = (maxRow?.number ?? 0) + 1

  const { count: existingCount } = await supabase
    .from('tables')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurant_id)
  const startIndex = existingCount ?? 0

  const floor = parseInt((formData.get('floor') as string) || '0', 10)

  const tablesToInsert = Array.from({ length: count }, (_, i) => ({
    restaurant_id,
    number: baseNumber + i,
    label: zone,
    floor,
    pos_x: 50 + ((startIndex + i) % 5) * 160,
    pos_y: 50 + Math.floor((startIndex + i) / 5) * 120,
  }))

  await supabase.from('tables').insert(tablesToInsert)

  revalidatePath('/dashboard/tables')
}

export async function deleteTable(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  await supabase.from('tables').delete().eq('id', id)
  revalidatePath('/dashboard/tables')
}

export async function updateTable(
  id: string,
  restaurantId: string,
  data: { number: number; label: string | null },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', restaurantId)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!restaurant) return

  await supabase
    .from('tables')
    .update({ number: data.number, label: data.label || null })
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
  revalidatePath('/dashboard/tables')
}

export async function deleteTableById(id: string, restaurantId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Vérifie que le restaurant appartient bien à l'utilisateur
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', restaurantId)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!restaurant) return

  await supabase.from('tables').delete().eq('id', id).eq('restaurant_id', restaurantId)
  revalidatePath('/dashboard/tables')
}

export async function saveFloorPlan(
  restaurantId: string,
  tables: { id: string; pos_x: number; pos_y: number }[],
  floors: { id: number; name: string; walls: { id: string; x: number; y: number; w: number; h: number }[] }[],
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', restaurantId)
    .eq('owner_id', user.id)
    .single()
  if (!restaurant) return

  // Mise à jour des positions en parallèle
  await Promise.all(
    tables.map((t) =>
      supabase
        .from('tables')
        .update({ pos_x: t.pos_x, pos_y: t.pos_y })
        .eq('id', t.id)
        .eq('restaurant_id', restaurantId),
    ),
  )

  // Sauvegarde des niveaux et murs dans restaurant.floor_plan
  await supabase
    .from('restaurants')
    .update({ floor_plan: { floors } })
    .eq('id', restaurantId)

  revalidatePath('/dashboard/tables')
}

// ─── Orders ───────────────────────────────────────────────────
export async function updateOrderStatus(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  const status = formData.get('status') as string

  const VALID_STATUSES = ['done', 'cancelled']
  if (!VALID_STATUSES.includes(status)) return

  // Vérifie que la commande appartient bien au restaurant de l'utilisateur
  const { data: order } = await supabase
    .from('orders')
    .select('id, restaurant_id, payment_method, payment_status, stripe_payment_intent_id')
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

  const updateData: Record<string, string> = { status }

  if (status === 'cancelled' && order.payment_method === 'online' && order.payment_status === 'paid' && order.stripe_payment_intent_id) {
    // Rembourser automatiquement via Stripe
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
      await stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id })
      updateData.payment_status = 'refunded'
    } catch {
      // Le remboursement a échoué mais on annule quand même la commande
    }
  }

  await supabase.from('orders').update(updateData).eq('id', id)
  revalidatePath('/dashboard/orders')
}

export async function collectCashPayment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  if (!id) return

  const { data: order } = await supabase
    .from('orders')
    .select('id, restaurant_id, payment_method, payment_status')
    .eq('id', id)
    .single()
  if (!order || order.payment_method !== 'cash' || order.payment_status !== 'unpaid') return

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', order.restaurant_id)
    .eq('owner_id', user.id)
    .single()
  if (!restaurant) return

  await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', id)
  revalidatePath('/dashboard/orders')
}

export async function archiveOrder(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  if (!id) return

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

  await supabase.from('orders').update({ archived_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/dashboard/orders')
}

export async function unarchiveOrder(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  if (!id) return

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

  await supabase.from('orders').update({ archived_at: null }).eq('id', id)
  revalidatePath('/dashboard/orders')
  revalidatePath('/dashboard/orders/archives')
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

function generatePickupCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const rand = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${rand(3)} ${rand(3)}`
}

export async function placeOrder(payload: {
  restaurantId: string
  tableId: string | null
  items: Array<{ itemId: string; quantity: number }>
  note: string
  paymentMethod?: 'cash' | 'online'
  fulfillmentType?: 'table' | 'pickup'
  customerEmail?: string
  pickupCode?: string
}): Promise<{ success: true; orderId: string; pickupCode?: string } | { success: false; error: string }> {
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

  // Client admin (service role) car le client est non authentifié
  const supabase = createAdminClient()

  // Verify restaurant exists + get HH config
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, happy_hour')
    .eq('id', payload.restaurantId)
    .single()
  if (!restaurant) return { success: false, error: 'Restaurant introuvable' }

  const isHH = checkHHActive(restaurant.happy_hour as HHData | null)

  // Fetch items from DB — never trust client-supplied prices
  const itemIds = payload.items.map(i => i.itemId)
  const { data: dbItems } = await supabase
    .from('items')
    .select('id, name, price, happy_hour_price, is_available, category_id')
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
  const fulfillmentType = payload.fulfillmentType ?? 'table'
  const customerEmail = payload.customerEmail?.trim() || null
  const pickupCode = fulfillmentType === 'pickup'
    ? (payload.pickupCode?.trim() || generatePickupCode())
    : null

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      restaurant_id: payload.restaurantId,
      table_id: payload.tableId ?? null,
      status: 'pending',
      payment_method: payload.paymentMethod ?? 'cash',
      payment_status: 'unpaid',
      customer_note: payload.note.trim() || null,
      fulfillment_type: fulfillmentType,
      pickup_code: pickupCode,
      customer_email: customerEmail,
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

  // Envoi email de confirmation pickup si email fourni
  if (fulfillmentType === 'pickup' && pickupCode && customerEmail && resend) {
    const itemsForEmail = payload.items.map(pi => {
      const dbItem = dbItems.find(i => i.id === pi.itemId)!
      const unitPrice = isHH && dbItem.happy_hour_price != null
        ? Number(dbItem.happy_hour_price)
        : Number(dbItem.price)
      return { name: dbItem.name ?? '', quantity: pi.quantity, unit_price: unitPrice }
    })
    const total = itemsForEmail.reduce((s, i) => s + i.unit_price * i.quantity, 0)
    const createdAt = new Date().toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Europe/Paris',
    })
    await resend.emails.send({
      from: 'Qomand <noreply@qomand.fr>',
      to: customerEmail,
      subject: `Votre commande chez ${restaurant.name}`,
      html: renderOrderEmail({
        restaurantName: restaurant.name,
        tableLabel: 'Retrait au comptoir',
        items: itemsForEmail,
        total,
        orderId: order.id,
        createdAt,
        pickupCode,
      }),
    }).catch(() => { /* email non bloquant */ })
  }

  revalidatePath('/dashboard/orders')
  return { success: true, orderId: order.id, pickupCode: pickupCode ?? undefined }
}

export async function markOrderReady(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  if (!id) return

  // Vérifier que la commande appartient au restaurant de l'utilisateur
  const { data: order } = await supabase
    .from('orders')
    .select('id, restaurant_id, pickup_code, customer_email')
    .eq('id', id)
    .single()
  if (!order) return

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('id', order.restaurant_id)
    .eq('owner_id', user.id)
    .single()
  if (!restaurant) return

  await supabase.from('orders').update({ status: 'ready' }).eq('id', id)

  // Envoyer email "commande prête" si le client a un email et un code
  if (order.customer_email && order.pickup_code && resend) {
    await resend.emails.send({
      from: 'Qomand <noreply@qomand.fr>',
      to: order.customer_email,
      subject: `Votre commande est prête chez ${restaurant.name}`,
      html: renderPickupReadyEmail({
        restaurantName: restaurant.name,
        pickupCode: order.pickup_code,
        orderId: order.id,
      }),
    }).catch(() => { /* email non bloquant */ })
  }

  revalidatePath('/dashboard/orders')
}
