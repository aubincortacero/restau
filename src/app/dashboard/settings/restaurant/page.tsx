import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveRestaurantId } from '@/lib/active-restaurant'
import { updateRestaurant, updatePaymentMethods, updateFulfillmentModes } from '@/app/actions/restaurant'

const INPUT = "w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"

export default async function SettingsRestaurantPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>
}) {
  const { saved } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const activeRestaurantId = await getActiveRestaurantId(user.id)

  const { data: restaurant } = activeRestaurantId
    ? await supabase.from('restaurants').select('id, name, slug, address, phone, accepted_payment_methods, fulfillment_modes').eq('id', activeRestaurantId).maybeSingle()
    : { data: null }

  if (!restaurant) redirect('/dashboard/new')

  return (
    <div className="max-w-xl space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-5">Informations du restaurant</h2>
        <form action={updateRestaurant} className="space-y-4">
          <input type="hidden" name="id" value={restaurant.id} />

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nom du restaurant</label>
            <input name="name" required defaultValue={restaurant.name} className={INPUT} />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Adresse</label>
            <input name="address" defaultValue={restaurant.address ?? ''} placeholder="12 rue de la Paix, Paris" className={INPUT} />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Téléphone</label>
            <input name="phone" type="tel" defaultValue={restaurant.phone ?? ''} placeholder="06 00 00 00 00" className={INPUT} />
          </div>

          <div className="pt-1">
            <p className="text-xs text-zinc-500 mb-3">Slug public : <span className="text-zinc-300">/{restaurant.slug}</span></p>
            <div className="flex items-center gap-3">
              <button type="submit" className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer">
                Enregistrer
              </button>
              {saved === 'info' && (
                <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  Enregistré
                </span>
              )}
            </div>
          </div>
        </form>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-1">Méthodes de paiement acceptées</h2>
        <p className="text-xs text-zinc-500 mb-5">Choisissez comment vos clients peuvent régler leur commande.</p>
        <form action={updatePaymentMethods} className="space-y-3">
          <input type="hidden" name="id" value={restaurant.id} />
          <label className="flex items-center justify-between gap-4 p-3 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
            <div>
              <p className="text-sm font-medium text-white">Paiement en ligne</p>
              <p className="text-xs text-zinc-500 mt-0.5">Le client paie par carte depuis son téléphone</p>
            </div>
            <input
              type="checkbox"
              name="online"
              value="1"
              defaultChecked={(restaurant.accepted_payment_methods ?? ['online', 'cash']).includes('online')}
              className="w-4 h-4 accent-orange-500 cursor-pointer"
            />
          </label>
          <label className="flex items-center justify-between gap-4 p-3 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
            <div>
              <p className="text-sm font-medium text-white">Paiement à la caisse</p>
              <p className="text-xs text-zinc-500 mt-0.5">Le client règle en espèces ou carte à la fin</p>
            </div>
            <input
              type="checkbox"
              name="cash"
              value="1"
              defaultChecked={(restaurant.accepted_payment_methods ?? ['online', 'cash']).includes('cash')}
              className="w-4 h-4 accent-orange-500 cursor-pointer"
            />
          </label>
          <div className="pt-1 flex items-center gap-3">
            <button type="submit" className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer">
              Enregistrer
            </button>
            {saved === 'payment' && (
              <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                Enregistré
              </span>
            )}
          </div>
        </form>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-1">Modes de service</h2>
        <p className="text-xs text-zinc-500 mb-5">Comment vos clients récupèrent leur commande.</p>
        <form action={updateFulfillmentModes} className="space-y-3">
          <input type="hidden" name="id" value={restaurant.id} />
          <label className="flex items-center justify-between gap-4 p-3 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
            <div>
              <p className="text-sm font-medium text-white">Livré à la table</p>
              <p className="text-xs text-zinc-500 mt-0.5">Le serveur apporte la commande à la table</p>
            </div>
            <input
              type="checkbox"
              name="table"
              value="1"
              defaultChecked={(restaurant.fulfillment_modes as string[] | null ?? ['table']).includes('table')}
              className="w-4 h-4 accent-orange-500 cursor-pointer"
            />
          </label>
          <label className="flex items-center justify-between gap-4 p-3 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
            <div>
              <p className="text-sm font-medium text-white">Retrait au comptoir</p>
              <p className="text-xs text-zinc-500 mt-0.5">Le client récupère sa commande avec un code</p>
            </div>
            <input
              type="checkbox"
              name="pickup"
              value="1"
              defaultChecked={(restaurant.fulfillment_modes as string[] | null ?? ['table']).includes('pickup')}
              className="w-4 h-4 accent-orange-500 cursor-pointer"
            />
          </label>
          <div className="pt-1 flex items-center gap-3">
            <button type="submit" className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer">
              Enregistrer
            </button>
            {saved === 'fulfillment' && (
              <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                Enregistré
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
