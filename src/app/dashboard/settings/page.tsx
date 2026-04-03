import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateProfile } from '@/app/actions/restaurant'
import { getActiveRestaurantId } from '@/lib/active-restaurant'

const INPUT = "w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"

export default async function SettingsProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, activeId] = await Promise.all([
    supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single(),
    getActiveRestaurantId(user.id),
  ])

  const profile = profileRes.data
  const avatarUrl = profile?.avatar_url ?? user.user_metadata?.avatar_url

  const { data: restaurant } = activeId
    ? await supabase.from('restaurants').select('slug, name').eq('id', activeId).single()
    : { data: null }

  return (
    <div className="max-w-xl space-y-6">
      {/* Lien vitrine */}
      {restaurant?.slug && (
        <a
          href={`/menu/${restaurant.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 px-5 py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 transition-colors group"
        >
          <div>
            <p className="text-sm font-semibold text-white">Voir ma vitrine client</p>
            <p className="text-xs text-orange-100/80 mt-0.5 truncate">{`qomand.fr/menu/${restaurant.slug}`}</p>
          </div>
          <svg className="w-5 h-5 text-white shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
      )}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-5">Profil</h2>
        <form action={updateProfile} className="space-y-5">
          {/* Avatar */}
          <div>
            <p className="text-xs text-zinc-400 mb-3">Photo de profil</p>
            <label className="flex items-center gap-4 cursor-pointer group">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700 group-hover:border-orange-500/40 shrink-0 transition-colors flex items-center justify-center">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-7 h-7 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-xs text-zinc-300 group-hover:text-white transition-colors">Changer la photo</p>
                <p className="text-xs text-zinc-600 mt-0.5">JPG, PNG, WebP — max 2 Mo</p>
              </div>
              <input type="file" name="avatar" accept="image/*" className="sr-only" />
            </label>
          </div>

          {/* Nom */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nom affiché</label>
            <input
              name="full_name"
              defaultValue={profile?.full_name ?? ''}
              placeholder="Votre nom"
              className={INPUT}
            />
          </div>

          {/* Email (lecture seule) */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email</label>
            <input
              value={user.email ?? ''}
              readOnly
              className={INPUT + ' opacity-50 cursor-not-allowed'}
            />
          </div>

          <button
            type="submit"
            className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            Enregistrer
          </button>
        </form>
      </div>
    </div>
  )
}

