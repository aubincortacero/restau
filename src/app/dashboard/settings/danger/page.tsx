import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { deleteAccount } from '@/app/actions/auth'

export default async function SettingsDangerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="max-w-xl">
      <div className="border border-red-900/40 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-red-400 mb-1">Zone dangereuse</h2>
        <p className="text-xs text-zinc-500 mb-5">Suppression irréversible de votre compte et de toutes vos données.</p>
        <form action={deleteAccount}>
          <button
            type="submit"
            className="text-xs text-red-400 hover:text-red-300 border border-red-900/60 hover:border-red-800 px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Supprimer mon compte
          </button>
        </form>
      </div>
    </div>
  )
}
