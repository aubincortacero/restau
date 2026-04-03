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
      .select('id, created_at, tables(number, label)')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'pending')
      .is('archived_at', null)
      .order('created_at', { ascending: true })

    const orders = (data ?? []).map((o) => ({
      id: o.id,
      created_at: o.created_at,
      table_number: (o.tables as unknown as { number: number; label: string | null } | null)?.number ?? null,
      table_label: (o.tables as unknown as { number: number; label: string | null } | null)?.label ?? null,
    }))

    return NextResponse.json({ count: orders.length, orders })
  }

  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .eq('status', 'pending')

  return NextResponse.json({ count: count ?? 0 })
}
