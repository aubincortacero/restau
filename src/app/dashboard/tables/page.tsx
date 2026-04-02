import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createTable, deleteTable } from '@/app/actions/restaurant'
import QRCodeDisplay from './QRCodeDisplay'
import { IconPlus } from '@/components/icons'

export default async function TablesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, slug')
    .eq('owner_id', user.id)
    .single()

  if (!restaurant) redirect('/dashboard/new')

  const { data: tables } = await supabase
    .from('tables')
    .select('id, number, label, is_active')
    .eq('restaurant_id', restaurant.id)
    .order('number')

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Tables & QR codes</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Chaque table génère un QR code unique</p>
        </div>
      </div>

      {/* Ajouter une table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-medium text-zinc-300 mb-3">Ajouter une table</h2>
        <form action={createTable} className="flex gap-2">
          <input type="hidden" name="restaurant_id" value={restaurant.id} />
          <input
            name="number"
            type="number"
            min="1"
            required
            placeholder="N° table"
            className="w-24 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
          />
          <input
            name="label"
            placeholder="Libellé (ex: Terrasse 1)"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <IconPlus className="w-3.5 h-3.5" />
            Ajouter
          </button>
        </form>
      </div>

      {/* Liste des tables */}
      {!tables || tables.length === 0 ? (
        <div className="text-center py-16 text-zinc-500 text-sm">
          Aucune table — ajoutez votre première table ci-dessus.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map((table) => {
            const url = `${siteUrl}/menu/${restaurant.slug}?table=${table.id}`
            return (
              <div key={table.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold text-white">Table {table.number}</p>
                    {table.label && <p className="text-xs text-zinc-400">{table.label}</p>}
                  </div>
                  <form action={deleteTable}>
                    <input type="hidden" name="id" value={table.id} />
                    <button type="submit" className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer rounded-lg hover:bg-red-400/10" title="Supprimer">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </form>
                </div>

                <QRCodeDisplay url={url} tableNumber={table.number} />

                <p className="text-xs text-zinc-600 mt-3 break-all">{url}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
