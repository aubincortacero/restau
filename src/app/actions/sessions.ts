'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { TableSession, SessionWithDetails, PartialPayment, SessionBalance, SelectedItemForPayment } from '@/types/session'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Gestion des sessions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Récupère une session active pour une table (sans créer)
 * Utilise le client admin pour permettre l'accès public aux clients non-authentifiés
 */
export async function getActiveTableSession(
  restaurantId: string,
  tableId: string
): Promise<{ session: TableSession | null; error?: string }> {
  const supabase = createAdminClient()

  console.log('[getActiveTableSession] Looking for session', { restaurantId, tableId })

  // Vérifier si une session active existe
  const { data: existingSession, error } = await supabase
    .from('table_sessions')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('table_id', tableId)
    .is('closed_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  console.log('[getActiveTableSession] Result:', { existingSession, error })

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
  const supabase = createAdminClient()

  console.log('[getSessionDetails] Fetching session:', sessionId)

  // 1. Récupérer la session
  const { data: session, error: sessionError } = await supabase
    .from('table_sessions')
    .select('*, table:tables(number, label)')
    .eq('id', sessionId)
    .single()

  console.log('[getSessionDetails] Session query:', { session, sessionError })

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
        size_label,
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
      size_label: item.size_label ?? null,
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
  const adminClient = createAdminClient()

  // Fermer la session
  const { error: sessionError } = await adminClient
    .from('table_sessions')
    .update({ closed_at: new Date().toISOString() })
    .eq('id', sessionId)

  if (sessionError) {
    console.error('Error closing session:', sessionError)
    return { success: false, error: sessionError.message }
  }

  // Archiver toutes les commandes de cette session
  const { error: ordersError } = await adminClient
    .from('orders')
    .update({ archived_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .is('archived_at', null)

  if (ordersError) {
    console.error('Error archiving session orders:', ordersError)
    // On continue quand même, c'est pas bloquant
  }

  revalidatePath('/dashboard/orders')
  return { success: true }
}

/**
 * Marque une commande comme livrée/servie
 */
export async function markOrderDelivered(orderId: string): Promise<{ success: boolean; error?: string }> {
  console.log('[markOrderDelivered] START - orderId:', orderId)
  
  // Utiliser directement le client admin - c'est une server action authentifiée
  const adminClient = createAdminClient()
  
  // Utiliser 'ready' au lieu de 'delivered' car l'ENUM order_status n'a pas 'delivered'
  const { error, data } = await adminClient
    .from('orders')
    .update({ status: 'ready' })
    .eq('id', orderId)
    .select()

  console.log('[markOrderDelivered] Update result:', { error, data, orderId })

  if (error) {
    console.error('[markOrderDelivered] Error marking order as delivered:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/orders')
  console.log('[markOrderDelivered] SUCCESS')
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
  // Utiliser adminClient pour éviter les problèmes RLS
  const adminClient = createAdminClient()

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
    size_label: item.size_label,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total: item.quantity * item.unit_price,
  }))

  // Créer le paiement partiel
  const { data: payment, error: paymentError } = await adminClient
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
    const { error: updateError } = await adminClient.rpc('increment_paid_quantity', {
      order_item_uuid: item.order_item_id,
      qty_to_add: item.quantity,
      amount_to_add: item.quantity * item.unit_price,
    })

    if (updateError) {
      console.error('Error updating order_item:', updateError)
    }
  }

  // Récupérer les commandes concernées et vérifier si elles sont entièrement payées
  const orderItemIds = selectedItems.map((item) => item.order_item_id)
  const { data: orderItems } = await adminClient
    .from('order_items')
    .select('order_id, quantity, paid_quantity')
    .in('id', orderItemIds)

  if (orderItems) {
    // Grouper par order_id
    const orderIds = [...new Set(orderItems.map((item) => item.order_id))]

    for (const orderId of orderIds) {
      // Récupérer tous les items de cette commande
      const { data: allItemsOfOrder } = await adminClient
        .from('order_items')
        .select('quantity, paid_quantity')
        .eq('order_id', orderId)

      // Vérifier si tous les items sont entièrement payés
      const isFullyPaid = allItemsOfOrder?.every(
        (item) => item.paid_quantity >= item.quantity
      )

      if (isFullyPaid) {
        // Mettre à jour le payment_status de la commande
        await adminClient
          .from('orders')
          .update({ payment_status: 'paid' })
          .eq('id', orderId)
      }
    }
  }

  revalidatePath('/dashboard/orders')
  
  // Envoyer le PDF par email si l'email est fourni
  if (customerEmail && resend && paymentMethod === 'online') {
    try {
      // Récupérer les informations de la session et du restaurant
      const { data: sessionData } = await adminClient
        .from('table_sessions')
        .select('restaurant_id, table_id, tables(number, label), restaurants(name)')
        .eq('id', sessionId)
        .single()

      if (sessionData) {
        const restaurantName = (sessionData.restaurants as any)?.name || 'Restaurant'
        const tableNumber = (sessionData.tables as any)?.number || ''
        const tableLabel = (sessionData.tables as any)?.label || ''
        const tableDisplay = tableLabel ? `Table ${tableNumber} — ${tableLabel}` : `Table ${tableNumber}`

        // Générer le PDF
        const jsPDF = (await import('jspdf')).jsPDF
        const doc = new jsPDF({ unit: 'mm', format: [80, 200], orientation: 'portrait' })

        const date = new Date(payment.created_at).toLocaleString('fr-FR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
          timeZone: 'Europe/Paris',
        })

        let y = 8
        const lineH = 5
        const w = 72

        // Header
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(restaurantName, w / 2, y, { align: 'center' })
        y += lineH

        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text('REÇU DE PAIEMENT PARTIEL', w / 2, y, { align: 'center' })
        y += lineH

        doc.setLineDashPattern([1, 1], 0)
        doc.line(4, y, w - 2, y)
        y += 4

        doc.setFontSize(8)
        doc.text(`Date : ${date}`, 4, y); y += lineH
        doc.text(tableDisplay, 4, y); y += lineH
        doc.text('Paiement : En ligne', 4, y); y += lineH

        doc.line(4, y, w - 2, y)
        y += 4

        // Articles
        doc.setFont('helvetica', 'bold')
        doc.text('Article', 4, y)
        doc.text('Total', w - 2, y, { align: 'right' })
        y += lineH
        doc.setFont('helvetica', 'normal')

        for (const item of paymentItems) {
          const total = item.total.toFixed(2) + ' EUR'
          const label = `${item.quantity}x ${item.item_name}${item.size_label ? ' ' + item.size_label : ''}`
          const lines = doc.splitTextToSize(label, w - 20) as string[]
          doc.text(lines, 4, y)
          doc.text(total, w - 2, y, { align: 'right' })
          y += lines.length * lineH
        }

        doc.line(4, y, w - 2, y)
        y += 4

        // Total
        const ht = totalAmount / 1.1
        const tva = totalAmount - ht

        doc.text('Montant HT :', 4, y)
        doc.text(`${ht.toFixed(2)} EUR`, w - 2, y, { align: 'right' })
        y += lineH

        doc.text('TVA 10% :', 4, y)
        doc.text(`${tva.toFixed(2)} EUR`, w - 2, y, { align: 'right' })
        y += lineH

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.text('TOTAL TTC :', 4, y)
        doc.text(`${totalAmount.toFixed(2)} EUR`, w - 2, y, { align: 'right' })
        y += lineH + 2

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.line(4, y, w - 2, y)
        y += 4
        doc.text('Merci de votre visite !', w / 2, y, { align: 'center' })
        y += lineH
        doc.text(`Réf. #${payment.id.slice(0, 8).toUpperCase()}`, w / 2, y, { align: 'center' })

        // Générer le PDF en base64
        const pdfBase64 = doc.output('datauristring').split(',')[1]

        // Envoyer l'email avec le PDF
        await resend.emails.send({
          from: 'Qomand <noreply@qomand.fr>',
          to: customerEmail,
          subject: `Reçu de paiement - ${restaurantName}`,
          html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #18181b; font-size: 24px; margin-bottom: 8px;">Reçu de paiement</h1>
              <p style="color: #71717a; margin-bottom: 24px;">Votre paiement a bien été enregistré</p>
              
              <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <h2 style="color: #27272a; font-size: 16px; margin: 0 0 12px 0;">${restaurantName}</h2>
                <p style="margin: 4px 0; color: #52525b; font-size: 14px;"><strong>Table :</strong> ${tableDisplay}</p>
                <p style="margin: 4px 0; color: #52525b; font-size: 14px;"><strong>Date :</strong> ${date}</p>
              </div>
              
              <div style="margin-bottom: 24px;">
                <h3 style="color: #27272a; font-size: 14px; margin-bottom: 12px;">Articles payés</h3>
                ${paymentItems.map(item => `
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e4e4e7;">
                    <span style="color: #3f3f46;">${item.quantity}x ${item.item_name}${item.size_label ? ' ' + item.size_label : ''}</span>
                    <span style="color: #18181b; font-weight: 600;">${item.total.toFixed(2)} €</span>
                  </div>
                `).join('')}
              </div>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">Total payé : ${totalAmount.toFixed(2)} €</p>
              </div>
              
              <p style="color: #71717a; font-size: 13px; margin-top: 32px;">
                Vous trouverez le reçu détaillé en pièce jointe.<br>
                Référence : #${payment.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          `,
          attachments: [
            {
              filename: `recu-${payment.id.slice(0, 8)}.pdf`,
              content: pdfBase64,
            },
          ],
        })

        console.log('[createPartialPayment] Email sent to:', customerEmail)
      }
    } catch (emailError) {
      console.error('[createPartialPayment] Error sending email:', emailError)
      // Ne pas faire échouer le paiement si l'email échoue
    }
  }
  
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
  const adminClient = createAdminClient()

  // Vérifier que le montant ne dépasse pas le reste à payer
  const { data: balanceData } = await adminClient
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

  const { error } = await adminClient
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

  console.log('[getActiveTableSessions] Fetching sessions for restaurant:', restaurantId)

  const { data: sessions, error } = await supabase
    .from('table_sessions')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .is('closed_at', null)
    .order('started_at', { ascending: false })

  console.log('[getActiveTableSessions] Query result:', { sessions, error })

  if (!sessions) return []

  const detailedSessions = await Promise.all(
    sessions.map((s) => getSessionDetails(s.id))
  )

  console.log('[getActiveTableSessions] Detailed sessions:', detailedSessions.length)

  return detailedSessions.filter((s): s is SessionWithDetails => s !== null)
}
