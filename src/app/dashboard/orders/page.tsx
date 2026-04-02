import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import TicketActions from './TicketActions'
import { IconCreditCard, IconBanknote } from '@/components/icons'
import { updateOrderStatus, archiveOrder } from '@/app/actions/restaurant'

const TVA_RATE = 0.10

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Paris',
  })
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'En attente',  color: 'text-yellow-400 bg-yellow-400/10' },
  done:      { label: 'Envoyée',     color: 'text-zinc-400 bg-zinc-800' },
  cancelled: { label: 'Annulée',     color: 'text-red-400 bg-red-400/10' },
}

const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
  paid:     { label: 'Payé',       color: 'text-emerald-400 bg-emerald-400/10' },
  unpaid:   { label: 'Impayé',     color: 'text-yellow-400 bg-yellow-400/10' },
  refunded: { label: 'Remboursé',  color: 'text-blue-400 bg-blue-400/10' },
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
    .is('archived_at', null)
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Commandes</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {totalPending > 0
              ? `${totalPending} commande${totalPending > 1 ? 's' : ''} en attente`
              : 'Toutes les commandes'}
          </p>
        </div>
        <Link
          href="/dashboard/orders/archives"
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-700 px-3 py-2 rounded-xl transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
          </svg>
          Archives
        </Link>
      </div>

      {enriched.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 text-sm">
          Aucune commande pour l&apos;instant.<br />
          <span className="text-zinc-600">Les commandes apparaîtront ici dès que vos clients commanderont.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {enriched.map((order) => {
            const statusInfo = STATUS_LABELS[order.status] ?? STATUS_LABELS.pending
            const payInfo = PAYMENT_STATUS[order.payment_status] ?? PAYMENT_STATUS.unpaid
            const table = order.tables as unknown as { number: number; label: string | null } | null
            const items = order.order_items as unknown as OrderItem[]
            const isPending = order.status === 'pending'

            return (
              <div
                key={order.id}
                className={`rounded-2xl overflow-hidden flex flex-col shadow-lg ${isPending ? 'bg-zinc-900 border-[3px] border-orange-500 shadow-orange-900/20' : 'bg-zinc-900 border border-zinc-800 shadow-transparent'}`}
              >
                {/* En-tête */}
                <div className="px-5 pt-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-xl font-bold leading-tight ${isPending ? 'text-white' : 'text-white'}`}>
                        {table ? `Table ${table.number}${table.label ? ` — ${table.label}` : ''}` : 'Table inconnue'}
                      </p>
                      <p className={`text-sm mt-0.5 ${isPending ? 'text-zinc-400' : 'text-zinc-500'}`}>{formatDate(order.created_at)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${isPending ? 'text-orange-400 bg-orange-500/15' : statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${isPending ? payInfo.color : payInfo.color}`}>
                        {payInfo.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`flex items-center gap-1 text-sm ${isPending ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {order.payment_method === 'online'
                        ? <><IconCreditCard className="w-4 h-4" /> En ligne</>
                        : <><IconBanknote className="w-4 h-4" /> Caisse</>
                      }
                    </span>
                    <span className={isPending ? 'text-zinc-700' : 'text-zinc-700'}>·</span>
                    <span className={`text-base font-bold ${isPending ? 'text-white' : 'text-white'}`}>{order.ttc.toFixed(2)} €</span>
                    <span className={`text-sm ${isPending ? 'text-zinc-500' : 'text-zinc-600'}`}>TTC</span>
                  </div>
                  {order.customer_note && (
                    <p className={`text-sm mt-2 italic rounded-xl px-3 py-2 ${isPending ? 'text-zinc-400 bg-zinc-800/60' : 'text-zinc-500 bg-zinc-800/60'}`}>
                      &ldquo;{order.customer_note}&rdquo;
                    </p>
                  )}
                </div>

                {/* Articles */}
                {items.length > 0 && (
                  <div className="px-5 pb-4 space-y-1.5">
                    {items.map((oi, i) => (
                      <div key={i} className="flex justify-between text-base">
                        <span className={`font-medium ${isPending ? 'text-white' : 'text-zinc-200'}`}>
                          <span className={`mr-1 ${isPending ? 'text-orange-400' : 'text-zinc-500'}`}>{oi.quantity}×</span>
                          {(oi.items as { name: string } | null)?.name ?? '—'}
                          {oi.note && <span className={`font-normal ${isPending ? 'text-zinc-400' : 'text-zinc-500'}`}> ({oi.note})</span>}
                        </span>
                        <span className={`shrink-0 ml-2 ${isPending ? 'text-zinc-300' : 'text-zinc-400'}`}>{(oi.quantity * Number(oi.unit_price)).toFixed(2)} €</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-auto px-4 pb-4 pt-2 flex flex-col gap-2">
                  {isPending && (
                    <form action={updateOrderStatus}>
                      <input type="hidden" name="id" value={order.id} />
                      <input type="hidden" name="status" value="done" />
                      <button
                        type="submit"
                        className="w-full bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold text-lg py-5 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                        </svg>
                        Commande envoyée
                      </button>
                    </form>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    {isPending ? (
                      <form action={updateOrderStatus}>
                        <input type="hidden" name="id" value={order.id} />
                        <input type="hidden" name="status" value="cancelled" />
                        <button type="submit" className="text-sm text-zinc-500 hover:text-red-400 border border-zinc-700 hover:border-red-500/30 px-3 py-2 rounded-xl transition-colors cursor-pointer">
                          Annuler
                        </button>
                      </form>
                    ) : (
                      <form action={archiveOrder}>
                        <input type="hidden" name="id" value={order.id} />
                        <button type="submit" className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                          </svg>
                          Archiver
                        </button>
                      </form>
                    )}
                    <TicketActions
                      inverted={isPending}
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
