// Types pour le système de sessions de table et paiement partiel

export type TableSession = {
  id: string
  restaurant_id: string
  table_id: string
  started_at: string
  closed_at: string | null
  total_amount: number
  paid_amount: number
  customer_count: number
  notes: string | null
  created_at: string
  updated_at: string
}

export type PartialPayment = {
  id: string
  session_id: string
  amount: number
  payment_method: 'online' | 'cash'
  payment_intent_id: string | null
  customer_name: string | null
  customer_email: string | null
  items: PaymentItem[]
  notes: string | null
  created_at: string
}

export type PaymentItem = {
  order_item_id: string
  item_name: string
  quantity: number
  unit_price: number
  total: number
}

export type SessionBalance = {
  total_amount: number
  paid_amount: number
  remaining_amount: number
  is_fully_paid: boolean
}

export type OrderItemWithPayment = {
  id: string
  item_name: string
  quantity: number
  unit_price: number
  paid_quantity: number
  paid_amount: number
  remaining_quantity: number
  remaining_amount: number
}

export type OrderWithItems = {
  id: string
  created_at: string
  status: string
  payment_status: string
  customer_note: string | null
  order_items: OrderItemWithPayment[]
}

export type SessionWithDetails = TableSession & {
  table: { number: number; label: string | null }
  orders: OrderWithItems[]
  partial_payments: PartialPayment[]
  balance: SessionBalance
}

// Type pour la sélection d'items à payer
export type SelectedItemForPayment = {
  order_item_id: string
  item_name: string
  quantity: number // quantité sélectionnée à payer
  unit_price: number
  max_quantity: number // quantité max disponible (non encore payée)
}
