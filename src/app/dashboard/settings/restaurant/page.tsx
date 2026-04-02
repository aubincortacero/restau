import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateRestaurant } from '@/app/actions/restaurant'

const INPUT = "w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"

export default async function SettingsRestaurantPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, slug, address, phone')
    .eq('owner_id', user.id)
    .single()

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
            <button type="submit" className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer">
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
