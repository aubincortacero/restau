import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get('restaurantId')
  if (!restaurantId) return NextResponse.json({ tableIds: [] })

  const supabase = await createClient()

  const { data } = await supabase
    .from('orders')
    .select('table_id')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'pending')
    .not('table_id', 'is', null)

  const tableIds = [...new Set((data ?? []).map((o) => o.table_id as string))]

  return NextResponse.json({ tableIds })
}
