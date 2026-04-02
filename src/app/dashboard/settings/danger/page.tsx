import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DeleteAccountButton from '@/components/DeleteAccountButton'

export default async function SettingsDangerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="max-w-xl">
      <div className="border border-red-900/40 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-red-400 mb-1">Zone dangereuse</h2>
        <p className="text-xs text-zinc-500 mb-5">Suppression irréversible de votre compte et de toutes vos données.</p>
        <DeleteAccountButton />
      </div>
    </div>
  )
}
