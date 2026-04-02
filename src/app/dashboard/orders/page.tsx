import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TicketActions from './TicketActions'
import { IconCreditCard, IconBanknote } from '@/components/icons'
import { updateOrderStatus } from '@/app/actions/restaurant'

const TVA_RATE = 0.10 // 10% restauration sur place

const NEXT_STATUS: Record<string, { status: string; label: string }> = {
  pending:   { status: 'confirmed', label: 'Confirmer' },
  confirmed: { status: 'preparing', label: 'En cuisine' },
  preparing: { status: 'ready',    label: 'Prête ✓' },
  ready:     { status: 'done',     label: 'Terminer' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Paris',
  })
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:    { label: 'En attente',  color: 'text-yellow-400 bg-yellow-400/10' },
  confirmed:  { label: 'Confirmée',   color: 'text-blue-400 bg-blue-400/10' },
  preparing:  { label: 'En cuisine',  color: 'text-orange-400 bg-orange-400/10' },
  ready:      { label: 'Prête',       color: 'text-emerald-400 bg-emerald-400/10' },
  done:       { label: 'Terminée',    color: 'text-zinc-400 bg-zinc-800' },
  cancelled:  { label: 'Annulée',     color: 'text-red-400 bg-red-400/10' },
}

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  if (!restaurant) redirect('/dashboard/new')

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, status, payment_method, payment_status,
      customer_note, created_at,
      tables(number, label),
      order_items(
        quantity, unit_price, note,
        items(name)
      )
    `)
    .eq('restaurant_id', restaurant.id)
    .order('created_at', { ascending: false })

  const enriched = (orders ?? []).map((order) => {
    const ttc = (order.order_items as unknown as OrderItem[]).reduce(
      (sum, oi) => sum + oi.quantity * Number(oi.unit_price), 0
    )
    const ht = ttc / (1 + TVA_RATE)
    const tva = ttc - ht
    return { ...order, ttc, ht, tva }
  })

  const totalPending = enriched.filter((o) => o.status === 'pending').length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Commandes</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {totalPending > 0
              ? `${totalPending} commande${totalPending > 1 ? 's' : ''} en attente`
              : 'Toutes les commandes'}
          </p>
        </div>
      </div>

      {enriched.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 text-sm">
          Aucune commande pour l&apos;instant.<br />
          <span className="text-zinc-600">Les commandes apparaîtront ici dès que vos clients commanderont.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
          {enriched.map((order) => {
            const status = STATUS_LABELS[order.status] ?? STATUS_LABELS.pending
const table = order.tables as unknown as { number: number; label: string | null } | null
                    const items = order.order_items as unknown as OrderItem[]

            return (
              <div key={order.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                {/* Ligne principale */}
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Table + date */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">
                        {table ? `Table ${table.number}${table.label ? ` — ${table.label}` : ''}` : 'Table inconnue'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        {order.payment_method === 'online'
                          ? <><IconCreditCard className="w-3.5 h-3.5" /> En ligne</>
                          : <><IconBanknote className="w-3.5 h-3.5" /> Caisse</>
                        }
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">{formatDate(order.created_at)}</p>
                    {order.customer_note && (
                      <p className="text-xs text-zinc-500 mt-1 italic">&ldquo;{order.customer_note}&rdquo;</p>
                    )}
                  </div>

                  {/* Montants */}
                  <div className="text-right shrink-0">
                    <p className="text-base font-semibold text-white">{order.ttc.toFixed(2)} € TTC</p>
                    <p className="text-xs text-zinc-400">dont TVA 10% : {order.tva.toFixed(2)} €</p>
                    <p className="text-xs text-zinc-500">HT : {order.ht.toFixed(2)} €</p>
                  </div>
                </div>

                {/* Détail des plats */}
                {items.length > 0 && (
                  <div className="border-t border-zinc-800 px-5 py-3 space-y-1">
                    {items.map((oi, i) => (
                      <div key={i} className="flex justify-between text-xs text-zinc-400">
                        <span>{oi.quantity}× {(oi.items as { name: string } | null)?.name ?? '—'}{oi.note ? ` (${oi.note})` : ''}</span>
                        <span>{(oi.quantity * Number(oi.unit_price)).toFixed(2)} €</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="border-t border-zinc-800 px-5 py-3 flex items-center justify-between gap-2">
                  {/* Boutons de progression statut */}
                  <div className="flex items-center gap-2">
                    {NEXT_STATUS[order.status] && (
                      <form action={updateOrderStatus}>
                        <input type="hidden" name="id" value={order.id} />
                        <input type="hidden" name="status" value={NEXT_STATUS[order.status].status} />
                        <button type="submit" className="text-xs bg-orange-500 hover:bg-orange-400 text-white font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                          {NEXT_STATUS[order.status].label}
                        </button>
                      </form>
                    )}
                    {!['done', 'cancelled'].includes(order.status) && (
                      <form action={updateOrderStatus}>
                        <input type="hidden" name="id" value={order.id} />
                        <input type="hidden" name="status" value="cancelled" />
                        <button type="submit" className="text-xs text-zinc-500 hover:text-red-400 border border-zinc-700 hover:border-red-500/40 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                          Annuler
                        </button>
                      </form>
                    )}
                  </div>
                  <TicketActions
                    order={{
                      id: order.id,
                      status: order.status,
                      created_at: order.created_at,
                      payment_method: order.payment_method,
                      ttc: order.ttc,
                      ht: order.ht,
                      tva: order.tva,
                      table: table ? `Table ${table.number}${table.label ? ` — ${table.label}` : ''}` : 'Table inconnue',
                      restaurant: restaurant.name,
                      items: items.map((oi) => ({
                        name: (oi.items as { name: string } | null)?.name ?? '—',
                        quantity: oi.quantity,
                        unit_price: Number(oi.unit_price),
                        note: oi.note ?? null,
                      })),
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

type OrderItem = {
  quantity: number
  unit_price: number
  note: string | null
  items: { name: string } | null
}
