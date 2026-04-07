import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveRestaurantId } from '@/lib/active-restaurant'
import { updateRestaurant } from '@/app/actions/restaurant'
import { PaymentMethodsForm, FulfillmentModesForm } from './PaymentSettingsForm'

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
    ? await supabase.from('restaurants').select('id, name, slug, address, phone, accepted_payment_methods, fulfillment_modes, brand_color, menu_button_radius, menu_header_style, cover_image_url').eq('id', activeRestaurantId).maybeSingle()
    : { data: null }

  if (!restaurant) redirect('/dashboard/new')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
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

      <PaymentMethodsForm
        restaurantId={restaurant.id}
        initial={restaurant.accepted_payment_methods ?? ['online', 'cash']}
        saved={saved === 'payment'}
      />

      <FulfillmentModesForm
        restaurantId={restaurant.id}
        initial={(restaurant.fulfillment_modes as string[] | null) ?? ['table']}
        saved={saved === 'fulfillment'}
      />

    </div>
  )
}
