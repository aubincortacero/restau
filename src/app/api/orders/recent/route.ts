import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get('since')
  const restaurantId = req.nextUrl.searchParams.get('restaurantId')

  if (!restaurantId) return NextResponse.json({ orders: [] })

  const supabase = await createClient()

  let query = supabase
    .from('orders')
    .select(`
      id, created_at,
      tables(number, label),
      order_items(quantity, unit_price)
    `)
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (since) {
    query = query.gt('created_at', since)
  }

  const { data } = await query

  const orders = (data ?? []).map((o) => ({
    id: o.id,
    created_at: o.created_at,
    table_number: (o.tables as unknown as { number: number; label: string | null } | null)?.number ?? null,
    table_label: (o.tables as unknown as { number: number; label: string | null } | null)?.label ?? null,
    total: ((o.order_items ?? []) as { quantity: number; unit_price: number }[]).reduce(
      (s, i) => s + i.quantity * Number(i.unit_price), 0
    ),
  }))

  return NextResponse.json({ orders })
}
