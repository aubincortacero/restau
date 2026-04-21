'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TableSession, SessionWithDetails, PartialPayment, SessionBalance, SelectedItemForPayment } from '@/types/session'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Gestion des sessions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Récupère une session active pour une table (sans créer)
 */
export async function getActiveTableSession(
  restaurantId: string,
  tableId: string
): Promise<{ session: TableSession | null; error?: string }> {
  const supabase = await createClient()

  // Vérifier si une session active existe
  const { data: existingSession } = await supabase
    .from('table_sessions')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('table_id', tableId)
    .is('closed_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return { session: existingSession }
}

/**
 * Récupère ou crée une session active pour une table
 */
export async function getOrCreateTableSession(
  restaurantId: string,
  tableId: string
): Promise<{ session: TableSession | null; error?: string }> {
  const supabase = await createClient()

  // Vérifier si une session active existe déjà
  const { data: existingSession } = await supabase
    .from('table_sessions')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('table_id', tableId)
    .is('closed_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  if (existingSession) {
    return { session: existingSession }
  }

  // Créer une nouvelle session
  const { data: newSession, error } = await supabase
    .from('table_sessions')
    .insert({
      restaurant_id: restaurantId,
      table_id: tableId,
      started_at: new Date().toISOString(),
      total_amount: 0,
      paid_amount: 0,
      customer_count: 1,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating session:', error)
    return { session: null, error: error.message }
  }

  return { session: newSession }
}

/**
 * Récupère les détails complets d'une session (avec commandes, paiements, balance)
 */
export async function getSessionDetails(sessionId: string): Promise<SessionWithDetails | null> {
  const supabase = await createClient()

  // 1. Récupérer la session
  const { data: session } = await supabase
    .from('table_sessions')
    .select('*, table:tables(number, label)')
    .eq('id', sessionId)
    .single()

  if (!session) return null

  // 2. Récupérer les commandes de la session
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,
      created_at,
      status,
      payment_status,
      order_items(
        id,
        quantity,
        unit_price,
        paid_quantity,
        paid_amount,
        items(name)
      )
    `)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })

  // 3. Récupérer les paiements partiels
  const { data: payments } = await supabase
    .from('partial_payments')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })

  // 4. Calculer la balance
  const { data: balanceData } = await supabase
    .rpc('get_session_balance', { session_uuid: sessionId })
    .single()

  const balanceRaw = balanceData as {
    total_amount: number
    paid_amount: number
    remaining_amount: number
    is_fully_paid: boolean
  } | null

  // Formater les order_items
  const formattedOrders = (orders ?? []).map((order: any) => ({
    ...order,
    order_items: (order.order_items ?? []).map((item: any) => ({
      id: item.id,
      item_name: item.items?.name ?? 'Article',
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      paid_quantity: item.paid_quantity ?? 0,
      paid_amount: Number(item.paid_amount ?? 0),
      remaining_quantity: item.quantity - (item.paid_quantity ?? 0),
      remaining_amount: (item.quantity - (item.paid_quantity ?? 0)) * Number(item.unit_price),
    })),
  }))

  const balance: SessionBalance = balanceRaw ? {
    total_amount: Number(balanceRaw.total_amount),
    paid_amount: Number(balanceRaw.paid_amount),
    remaining_amount: Number(balanceRaw.remaining_amount),
    is_fully_paid: balanceRaw.is_fully_paid,
  } : {
    total_amount: Number(session.total_amount),
    paid_amount: Number(session.paid_amount),
    remaining_amount: Number(session.total_amount) - Number(session.paid_amount),
    is_fully_paid: Number(session.paid_amount) >= Number(session.total_amount),
  }

  return {
    ...session,
    table: session.table,
    orders: formattedOrders,
    partial_payments: (payments ?? []) as PartialPayment[],
    balance,
  }
}

/**
 * Ferme une session (quand les clients partent)
 */
export async function closeTableSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('table_sessions')
    .update({ closed_at: new Date().toISOString() })
    .eq('id', sessionId)

  if (error) {
    console.error('Error closing session:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/orders')
  return { success: true }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Paiements partiels
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Crée un paiement partiel (cash ou online)
 */
export async function createPartialPayment(
  sessionId: string,
  selectedItems: SelectedItemForPayment[],
  paymentMethod: 'online' | 'cash',
  paymentIntentId?: string,
  customerName?: string,
  customerEmail?: string
): Promise<{ success: boolean; payment?: PartialPayment; error?: string }> {
  const supabase = await createClient()

  // Calculer le montant total
  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  )

  if (totalAmount <= 0) {
    return { success: false, error: 'Montant invalide' }
  }

  // Préparer les items pour le JSON
  const paymentItems = selectedItems.map((item) => ({
    order_item_id: item.order_item_id,
    item_name: item.item_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total: item.quantity * item.unit_price,
  }))

  // Créer le paiement partiel
  const { data: payment, error: paymentError } = await supabase
    .from('partial_payments')
    .insert({
      session_id: sessionId,
      amount: totalAmount,
      payment_method: paymentMethod,
      payment_intent_id: paymentIntentId,
      customer_name: customerName,
      customer_email: customerEmail,
      items: paymentItems,
    })
    .select()
    .single()

  if (paymentError) {
    console.error('Error creating partial payment:', paymentError)
    return { success: false, error: paymentError.message }
  }

  // Mettre à jour les order_items avec les quantités payées
  for (const item of selectedItems) {
    const { error: updateError } = await supabase.rpc('increment_paid_quantity', {
      order_item_uuid: item.order_item_id,
      qty_to_add: item.quantity,
      amount_to_add: item.quantity * item.unit_price,
    })

    if (updateError) {
      console.error('Error updating order_item:', updateError)
    }
  }

  revalidatePath('/dashboard/orders')
  return { success: true, payment: payment as PartialPayment }
}

/**
 * Enregistre un paiement cash depuis le dashboard restaurateur
 */
export async function recordCashPayment(
  sessionId: string,
  amount: number,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Vérifier que le montant ne dépasse pas le reste à payer
  const { data: balanceData } = await supabase
    .rpc('get_session_balance', { session_uuid: sessionId })
    .single()

  const balanceRaw = balanceData as {
    total_amount: number
    paid_amount: number
    remaining_amount: number
    is_fully_paid: boolean
  } | null

  if (balanceRaw && amount > Number(balanceRaw.remaining_amount)) {
    return { success: false, error: 'Le montant dépasse le reste à payer' }
  }

  const { error } = await supabase
    .from('partial_payments')
    .insert({
      session_id: sessionId,
      amount,
      payment_method: 'cash',
      notes,
      items: [], // Paiement global sans détail des items
    })

  if (error) {
    console.error('Error recording cash payment:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/orders')
  return { success: true }
}

/**
 * Récupère toutes les sessions actives d'un restaurant
 */
export async function getActiveTableSessions(restaurantId: string): Promise<SessionWithDetails[]> {
  const supabase = await createClient()

  const { data: sessions } = await supabase
    .from('table_sessions')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .is('closed_at', null)
    .order('started_at', { ascending: false })

  if (!sessions) return []

  const detailedSessions = await Promise.all(
    sessions.map((s) => getSessionDetails(s.id))
  )

  return detailedSessions.filter((s): s is SessionWithDetails => s !== null)
}
