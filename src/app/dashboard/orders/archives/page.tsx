import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import TicketActions from '../TicketActions'
import { IconCreditCard, IconBanknote } from '@/components/icons'
import { unarchiveOrder } from '@/app/actions/restaurant'

const TVA_RATE = 0.10

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Paris',
  })
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'En attente', color: 'text-yellow-400 bg-yellow-400/10' },
  done:      { label: 'Envoyée',    color: 'text-zinc-400 bg-zinc-800' },
  cancelled: { label: 'Annulée',    color: 'text-red-400 bg-red-400/10' },
}

const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
  paid:     { label: 'Payé',      color: 'text-emerald-400 bg-emerald-400/10' },
  unpaid:   { label: 'Impayé',    color: 'text-yellow-400 bg-yellow-400/10' },
  refunded: { label: 'Remboursé', color: 'text-blue-400 bg-blue-400/10' },
}

type OrderItem = {
  quantity: number
  unit_price: number
  note: string | null
  items: { name: string } | null
}

export default async function ArchivesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  if (!restaurant) redirect('/dashboard/new')

  const sp = await searchParams
  const q = ((sp.q as string | undefined) ?? '').trim()
  const filterStatus = sp.status as string | undefined
  const filterPaymentMethod = sp.payment_method as string | undefined
  const filterPaymentStatus = sp.payment_status as string | undefined
  const dateFrom = sp.date_from as string | undefined
  const dateTo = sp.date_to as string | undefined
  const page = Math.max(1, parseInt((sp.page as string | undefined) ?? '1', 10))

  const PAGE_SIZE = 20
  const hasFilters = !!(q || filterStatus || filterPaymentMethod || filterPaymentStatus || dateFrom || dateTo)

  let baseQuery = supabase
    .from('orders')
    .select(`
      id, status, payment_method, payment_status,
      customer_note, created_at, archived_at,
      tables(number, label),
      order_items(quantity, unit_price, note, items(name))
    `, { count: 'exact' })
    .eq('restaurant_id', restaurant.id)
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false })

  if (filterStatus) baseQuery = baseQuery.eq('status', filterStatus)
  if (filterPaymentMethod) baseQuery = baseQuery.eq('payment_method', filterPaymentMethod)
  if (filterPaymentStatus) baseQuery = baseQuery.eq('payment_status', filterPaymentStatus)
  if (dateFrom) baseQuery = baseQuery.gte('created_at', dateFrom)
  if (dateTo) baseQuery = baseQuery.lte('created_at', dateTo + 'T23:59:59')

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const { data: orders, count: totalCount } = await baseQuery.range(from, to)

  const totalPages = Math.max(1, Math.ceil((totalCount ?? 0) / PAGE_SIZE))

  const enriched = (orders ?? [])
    .map((order) => {
      const ttc = (order.order_items as unknown as OrderItem[]).reduce(
        (sum, oi) => sum + oi.quantity * Number(oi.unit_price), 0
      )
      const ht = ttc / (1 + TVA_RATE)
      const tva = ttc - ht
      return { ...order, ttc, ht, tva }
    })
    .filter((order) => {
      if (!q) return true
      const table = order.tables as unknown as { number: number; label: string | null } | null
      const tableStr = table ? `table ${table.number} ${table.label ?? ''}` : 'table inconnue'
      const idShort = order.id.slice(0, 8).toLowerCase()
      return (
        tableStr.toLowerCase().includes(q.toLowerCase()) ||
        idShort.includes(q.toLowerCase()) ||
        order.ttc.toFixed(2).includes(q)
      )
    })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard/orders"
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors shrink-0"
        >
          <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Archives</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {enriched.length} commande{enriched.length !== 1 ? 's' : ''}
            {hasFilters && ' trouvée' + (enriched.length !== 1 ? 's' : '')}
            {totalCount !== null && !hasFilters && totalCount > PAGE_SIZE && (
              <span className="text-zinc-600"> · page {page}/{totalPages}</span>
            )}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <form method="GET" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6 flex flex-wrap gap-3">
        {/* Recherche texte */}
        <div className="flex-1 min-w-48">
          <input
            name="q"
            defaultValue={q}
            placeholder="Table, montant, réf..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>

        {/* Statut */}
        <select
          name="status"
          defaultValue={filterStatus ?? ''}
          className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500 cursor-pointer"
        >
          <option value="">Tous les statuts</option>
          <option value="done">Envoyée</option>
          <option value="cancelled">Annulée</option>
        </select>

        {/* Méthode de paiement */}
        <select
          name="payment_method"
          defaultValue={filterPaymentMethod ?? ''}
          className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500 cursor-pointer"
        >
          <option value="">Tous les paiements</option>
          <option value="online">En ligne</option>
          <option value="cash">Caisse</option>
        </select>

        {/* Statut paiement */}
        <select
          name="payment_status"
          defaultValue={filterPaymentStatus ?? ''}
          className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500 cursor-pointer"
        >
          <option value="">Tous (encaissement)</option>
          <option value="paid">Payé</option>
          <option value="unpaid">Impayé</option>
          <option value="refunded">Remboursé</option>
        </select>

        {/* Dates */}
        <input
          type="date"
          name="date_from"
          defaultValue={dateFrom ?? ''}
          className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-500 cursor-pointer"
        />
        <input
          type="date"
          name="date_to"
          defaultValue={dateTo ?? ''}
          className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-500 cursor-pointer"
        />

        <div className="flex gap-2 ml-auto">
          {hasFilters && (
            <Link
              href="/dashboard/orders/archives"
              className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-colors"
            >
              Réinitialiser
            </Link>
          )}
          <button
            type="submit"
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
          >
            Rechercher
          </button>
        </div>
      </form>

      {/* Résultats */}
      {enriched.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 text-sm">
          Aucune commande archivée{hasFilters ? ' pour ces critères' : ''}.<br />
          <span className="text-zinc-600">Les commandes archivées depuis la page commandes apparaîtront ici.</span>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {/* En-tête table */}
          <div className="hidden md:grid grid-cols-[1fr_140px_80px_100px_80px_auto] gap-4 px-5 py-3 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wide">
            <span>Commande</span>
            <span>Date</span>
            <span className="text-right">Montant</span>
            <span>Statut</span>
            <span>Paiement</span>
            <span className="text-right">Actions</span>
          </div>

          <div className="divide-y divide-zinc-800">
            {enriched.map((order) => {
              const statusInfo = STATUS_LABELS[order.status] ?? STATUS_LABELS.done
              const payInfo = PAYMENT_STATUS[order.payment_status] ?? PAYMENT_STATUS.unpaid
              const table = order.tables as unknown as { number: number; label: string | null } | null
              const items = order.order_items as unknown as OrderItem[]

              return (
                <div key={order.id} className="px-5 py-4 hover:bg-zinc-800/40 transition-colors">
                  {/* Desktop row */}
                  <div className="hidden md:grid grid-cols-[1fr_140px_80px_100px_80px_auto] gap-4 items-center">
                    {/* Commande */}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {table ? `Table ${table.number}${table.label ? ` — ${table.label}` : ''}` : 'Table inconnue'}
                      </p>
                      <p className="text-xs text-zinc-600 mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono">#{order.id.slice(0, 8).toUpperCase()}</span>
                        <span>·</span>
                        <span>{items.length} article{items.length !== 1 ? 's' : ''}</span>
                        {order.payment_method === 'online'
                          ? <><IconCreditCard className="w-3 h-3" /> En ligne</>
                          : <><IconBanknote className="w-3 h-3" /> Caisse</>
                        }
                      </p>
                    </div>

                    {/* Date */}
                    <span className="text-xs text-zinc-400">{formatDate(order.created_at)}</span>

                    {/* Montant */}
                    <span className="text-sm font-bold text-white text-right">{order.ttc.toFixed(2)} €</span>

                    {/* Statut */}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>

                    {/* Paiement */}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${payInfo.color}`}>
                      {payInfo.label}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-2 justify-end">
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
                      <form action={unarchiveOrder}>
                        <input type="hidden" name="id" value={order.id} />
                        <button
                          type="submit"
                          title="Désarchiver"
                          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15M9 12l3 3m0 0 3-3m-3 3V2.25" />
                          </svg>
                          Restaurer
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Mobile card */}
                  <div className="md:hidden space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {table ? `Table ${table.number}${table.label ? ` — ${table.label}` : ''}` : 'Table inconnue'}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">{formatDate(order.created_at)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-bold text-white">{order.ttc.toFixed(2)} €</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${payInfo.color}`}>{payInfo.label}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-between">
                      <span className="text-xs text-zinc-600 font-mono">#{order.id.slice(0, 8).toUpperCase()}</span>
                      <div className="flex items-center gap-2">
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
                        <form action={unarchiveOrder}>
                          <input type="hidden" name="id" value={order.id} />
                          <button type="submit" className="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                            Restaurer
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {page > 1 && (
            <Link
              href={{ pathname: '/dashboard/orders/archives', query: { ...Object.fromEntries(Object.entries({ q, status: filterStatus, payment_method: filterPaymentMethod, payment_status: filterPaymentStatus, date_from: dateFrom, date_to: dateTo }).filter(([, v]) => v)), page: page - 1 } }}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 rounded-xl transition-colors"
            >
              ← Précédent
            </Link>
          )}
          <span className="text-sm text-zinc-500 px-2">
            Page {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={{ pathname: '/dashboard/orders/archives', query: { ...Object.fromEntries(Object.entries({ q, status: filterStatus, payment_method: filterPaymentMethod, payment_status: filterPaymentStatus, date_from: dateFrom, date_to: dateTo }).filter(([, v]) => v)), page: page + 1 } }}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 rounded-xl transition-colors"
            >
              Suivant →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
