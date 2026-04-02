import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsNavLink from '@/components/SettingsNavLink'

const SETTINGS_NAV = [
  { href: '/dashboard/settings', label: 'Profil', exact: true },
  { href: '/dashboard/settings/restaurant', label: 'Restaurant' },
  { href: '/dashboard/settings/schedules', label: 'Horaires & Happy Hour' },
  { href: '/dashboard/settings/stripe', label: 'Stripe Connect' },
  { href: '/dashboard/settings/danger', label: 'Zone dangereuse', danger: true },
]

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Paramètres</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Gérez votre profil et votre restaurant</p>
      </div>

      <div className="flex gap-8 items-start">
        {/* Sidebar */}
        <nav className="w-48 shrink-0 hidden md:block">
          <ul className="space-y-0.5">
            {SETTINGS_NAV.map((item) => (
              <li key={item.href}>
                <SettingsNavLink {...item} />
              </li>
            ))}
          </ul>
        </nav>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  )
}

