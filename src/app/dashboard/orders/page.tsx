import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveRestaurantId } from '@/lib/active-restaurant'
import TicketActions from './TicketActions'
import { IconCreditCard, IconBanknote } from '@/components/icons'
import { updateOrderStatus, archiveOrder, markOrderReady, collectCashPayment } from '@/app/actions/restaurant'
import OrderTimer from '@/components/OrderTimer'
import PageTutorial, { type PageTutorialStep } from '@/components/PageTutorial'
import { getActiveTableSessions } from '@/app/actions/sessions'
import { ActiveTabCard } from '@/components/ActiveTabCard'

const ORDERS_TUTORIAL_STEPS: PageTutorialStep[] = [
  {
    selector: '[data-page-tutorial="orders-header"]',
    emoji: '🔔',
    title: 'Vos commandes en temps réel',
    description:
      'Dès qu’un client scanne le QR code de sa table et passe commande, elle apparaît ici instantanément. Vous êtes aussi notifié par une cloche en haut de la sidebar.',
  },
  {
    selector: '[data-page-tutorial="orders-list"]',
    emoji: '✅',
    title: 'Gérez chaque ticket',
    description:
      'Lisez les plats commandés, acceptez la commande, ou annulez-la. Les tickets en attente sont encadrés en orange, les commandes prêtes en bleu.',
  },
  {
    selector: '[data-page-tutorial="orders-archives"]',
    emoji: '📦',
    title: 'Archives',
    description:
      'Les commandes traitées sont automatiquement archivées. Retrouvez-y le détail de chaque ticket, les montants HT / TTC, et le mode de paiement.',
  },
]

type HappyHour = { enabled: boolean; start: string; end: string; days: string[]; urgency_threshold?: number }

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
  ready:     { label: 'Prête',       color: 'text-emerald-400 bg-emerald-400/10' },
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

  const activeRestaurantId = await getActiveRestaurantId(user.id)

  const { data: restaurant } = activeRestaurantId
    ? await supabase.from('restaurants').select('id, name, accepted_payment_methods, fulfillment_modes').eq('id', activeRestaurantId).maybeSingle()
    : { data: null }

  if (!restaurant) redirect('/dashboard/new')

  const { data: restaurantFull } = await supabase
    .from('restaurants')
    .select('happy_hour')
    .eq('id', restaurant.id)
    .single()

  const urgencyThreshold = (restaurantFull?.happy_hour as HappyHour | null)?.urgency_threshold ?? 5

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, status, payment_method, payment_status,
      customer_note, created_at, session_id,
      fulfillment_type, pickup_code, customer_email,
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

  const totalPending = enriched.filter((o) => o.status === 'pending' && !o.session_id).length

  // Récupérer les sessions actives
  const activeSessions = await getActiveTableSessions(restaurant.id)

  return (
    <div>
      <div className="flex items-center justify-between mb-8" data-page-tutorial="orders-header">
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
          data-page-tutorial="orders-archives"
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-700 px-3 py-2 rounded-xl transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
          </svg>
          Archives
        </Link>
      </div>

      {/* Ardoises actives */}
      {activeSessions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            <span>Ardoises en cours</span>
            <span className="text-sm text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-full">
              {activeSessions.length}
            </span>
          </h2>
          <div className="flex flex-col gap-4">
            {activeSessions.map((session) => (
              <ActiveTabCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}

      {/* Commandes individuelles (hors ardoise) */}
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-2xl">🧾</span>
        <span>Commandes individuelles</span>
      </h2>

      {enriched.filter(o => !o.session_id).length === 0 ? (
        <div data-page-tutorial="orders-list" className="text-center py-20 text-zinc-500 text-sm">
          Aucune commande individuelle pour l&apos;instant.<br />
          <span className="text-zinc-600">Les commandes apparaîtront ici dès que vos clients commanderont.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" data-page-tutorial="orders-list">
          {enriched.filter(order => !order.session_id).map((order) => {
            const statusInfo = STATUS_LABELS[order.status] ?? STATUS_LABELS.pending
            const payInfo = PAYMENT_STATUS[order.payment_status] ?? PAYMENT_STATUS.unpaid
            const table = order.tables as unknown as { number: number; label: string | null } | null
            const items = order.order_items as unknown as OrderItem[]
            const isPending = order.status === 'pending'
            const isReady = order.status === 'ready'
            const isActive = isPending || isReady
            const isPickup = order.fulfillment_type === 'pickup'
            const isCashUnpaid = order.payment_method === 'cash' && order.payment_status === 'unpaid'

            return (
              <div
                key={order.id}
                className={`rounded-2xl overflow-hidden flex flex-col ${
                  isPending 
                    ? 'bg-zinc-900 border-[2.5px] border-orange-500 shadow-lg shadow-orange-950/40' 
                    : isReady 
                      ? 'bg-zinc-900 border-[2.5px] border-blue-500 shadow-lg shadow-blue-950/40' 
                      : 'bg-zinc-900 border border-zinc-800'
                }`}
              >
                {/* En-tête */}
                <div className="px-5 pt-5 pb-4 flex items-center gap-4">
                  {/* Numéro de table — très visible */}
                  <div className={`text-5xl font-black tabular-nums leading-none shrink-0 ${
                    isPending ? 'text-orange-400' : isReady ? 'text-blue-400' : 'text-zinc-500'
                  }`}>
                    {table?.number ?? '?'}
                  </div>

                  {/* Infos centrales */}
                  <div className="flex-1 min-w-0">
                    {table?.label && (
                      <p className={`text-base font-semibold leading-tight truncate ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                        {table.label}
                      </p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      {isActive ? (
                        <OrderTimer createdAt={order.created_at} thresholdMinutes={urgencyThreshold} />
                      ) : (
                        <span className="text-xs text-zinc-600">{formatDate(order.created_at)}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${payInfo.color}`}>
                        {payInfo.label}
                      </span>
                      {!isActive && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 mt-1 text-xs ${isActive ? 'text-zinc-500' : 'text-zinc-600'}`}>
                      {order.payment_method === 'online'
                        ? <><IconCreditCard className="w-3.5 h-3.5" /> En ligne</>
                        : <><IconBanknote className="w-3.5 h-3.5" /> Caisse</>
                      }
                      {isPickup && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium text-[11px]">
                          🛍️ Comptoir
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Montant */}
                  <div className={`text-2xl font-bold tabular-nums shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`}>
                    {order.ttc.toFixed(2)} €
                  </div>
                </div>

                {/* Note client */}
                {order.customer_note && (
                  <div className={`mx-5 mb-3 text-sm italic rounded-xl px-3 py-2 ${isActive ? 'text-zinc-400 bg-zinc-800/60' : 'text-zinc-500 bg-zinc-800/60'}`}>
                    &ldquo;{order.customer_note}&rdquo;
                  </div>
                )}

                {/* Séparateur + Articles */}
                {items.length > 0 && (
                  <div className={`mx-5 mb-4 rounded-xl overflow-hidden border ${isActive ? 'border-zinc-800' : 'border-zinc-800/60'}`}>
                    {items.map((oi, i) => (
                      <div key={i} className={`flex justify-between items-baseline px-3 py-2 text-sm ${i > 0 ? 'border-t border-zinc-800' : ''}`}>
                        <span className={isActive ? 'text-white' : 'text-zinc-300'}>
                          <span className={`font-bold mr-1.5 ${isPending ? 'text-orange-400' : isReady ? 'text-blue-400' : 'text-zinc-500'}`}>{oi.quantity}×</span>
                          {(oi.items as { name: string } | null)?.name ?? '—'}
                          {oi.note && <span className="text-zinc-500 font-normal"> · {oi.note}</span>}
                        </span>
                        <span className={`shrink-0 ml-3 tabular-nums ${isActive ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {(oi.quantity * Number(oi.unit_price)).toFixed(2)} €
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Code retrait */}
                {isPickup && order.pickup_code && (
                  <div className={`mx-5 mb-4 rounded-xl border-2 px-4 py-3 text-center ${isActive ? 'border-blue-500/50 bg-blue-500/5' : 'border-zinc-700 bg-zinc-800/40'}`}>
                    <p className="text-[11px] text-zinc-500 uppercase tracking-widest mb-1 font-medium">Code de retrait</p>
                    <p className={`text-2xl font-black tracking-widest font-mono ${isActive ? 'text-blue-300' : 'text-zinc-400'}`}>{order.pickup_code}</p>
                    {order.customer_email && (
                      <p className="text-[11px] text-zinc-600 mt-1 truncate">{order.customer_email}</p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-auto px-4 pb-4 flex flex-col gap-2">
                  {isPending && (
                    isPickup ? (
                      <form action={markOrderReady}>
                        <input type="hidden" name="id" value={order.id} />
                        <button
                          type="submit"
                          className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-base py-4 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                          Commande prête
                        </button>
                      </form>
                    ) : (
                      <form action={updateOrderStatus}>
                        <input type="hidden" name="id" value={order.id} />
                        <input type="hidden" name="status" value="done" />
                        <button
                          type="submit"
                          className="w-full bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold text-base py-4 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                          </svg>
                          Commande envoyée
                        </button>
                      </form>
                    )
                  )}
                  {isReady && isPickup && (
                    <form action={updateOrderStatus}>
                      <input type="hidden" name="id" value={order.id} />
                      <input type="hidden" name="status" value="done" />
                      <button
                        type="submit"
                        className="w-full bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white font-bold text-base py-4 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Commande récupérée
                      </button>
                    </form>
                  )}
                  {isCashUnpaid && (
                    <form action={collectCashPayment}>
                      <input type="hidden" name="id" value={order.id} />
                      <button
                        type="submit"
                        className="w-full bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white font-bold text-base py-4 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                        </svg>
                        Encaisser la commande
                      </button>
                    </form>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    {isActive ? (
                      <form action={updateOrderStatus}>
                        <input type="hidden" name="id" value={order.id} />
                        <input type="hidden" name="status" value="cancelled" />
                        <button type="submit" className="text-xs text-zinc-600 hover:text-red-400 transition-colors cursor-pointer">
                          Annuler
                        </button>
                      </form>
                    ) : (
                      <form action={archiveOrder}>
                        <input type="hidden" name="id" value={order.id} />
                        <button type="submit" className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                          </svg>
                          Archiver
                        </button>
                      </form>
                    )}
                    <TicketActions
                      inverted={isActive}
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

      <PageTutorial steps={ORDERS_TUTORIAL_STEPS} storageKey="tutorial_page_orders_v1" />
    </div>
  )
}

type OrderItem = {
  quantity: number
  unit_price: number
  note: string | null
  items: { name: string } | null
}
