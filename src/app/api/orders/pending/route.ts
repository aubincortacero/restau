import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get('restaurantId')
  if (!restaurantId) return NextResponse.json({ count: 0 })

  const supabase = await createClient()
  const detail = req.nextUrl.searchParams.get('detail') === '1'

  if (detail) {
    const { data } = await supabase
      .from('orders')
      .select('id, created_at, session_id, tables(number, label), table_sessions(closed_at), order_items(quantity, unit_price)')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'pending')
      .is('archived_at', null)
      .order('created_at', { ascending: true })

    // Ne garder que les commandes dont la session n'est pas fermée (ou sans session)
    const activeOrders = (data ?? []).filter((o) => {
      const session = o.table_sessions as unknown as { closed_at: string | null } | null
      return !session || session.closed_at === null
    })

    const orders = activeOrders.map((o) => {
      const items = (o.order_items as unknown as { quantity: number; unit_price: number }[]) ?? []
      const total = items.reduce((sum, i) => sum + i.quantity * Number(i.unit_price), 0)
      return {
        id: o.id,
        created_at: o.created_at,
        table_number: (o.tables as unknown as { number: number; label: string | null } | null)?.number ?? null,
        table_label: (o.tables as unknown as { number: number; label: string | null } | null)?.label ?? null,
        total,
      }
    })

    return NextResponse.json({ count: orders.length, orders })
  }

  // Pour le count simple, on doit aussi filtrer par session active
  const { data: countData } = await supabase
    .from('orders')
    .select('id, session_id, table_sessions(closed_at)')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'pending')
    .is('archived_at', null)

  const activeCount = (countData ?? []).filter((o) => {
    const session = o.table_sessions as unknown as { closed_at: string | null } | null
    return !session || session.closed_at === null
  }).length

  return NextResponse.json({ count: activeCount })
}
