import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createRestaurant } from '@/app/actions/restaurant'

export default async function NewRestaurantPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-500 mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white">Créer votre restaurant</h1>
          <p className="text-sm text-zinc-400 mt-1">Vous pourrez modifier ces informations plus tard.</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          {params.error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-950 border border-red-800 text-sm text-red-300">
              Une erreur est survenue. Réessayez.
            </div>
          )}

          <form action={createRestaurant} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Nom du restaurant <span className="text-red-400">*</span>
              </label>
              <input
                name="name"
                required
                placeholder="Le Petit Bistrot"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Adresse
              </label>
              <input
                name="address"
                placeholder="12 rue de la Paix, Paris"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Téléphone
              </label>
              <input
                name="phone"
                type="tel"
                placeholder="06 00 00 00 00"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors cursor-pointer mt-2"
            >
              Créer mon restaurant
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
