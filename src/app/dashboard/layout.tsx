import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import { IconLogo } from '@/components/icons'
import { NavDesktop, MobileNav } from '@/components/NavLinks'
import UserMenu from '@/components/UserMenu'
import RestaurantPicker from '@/components/RestaurantPicker'
import { getRestaurantsWithActive, ACTIVE_RESTAURANT_COOKIE } from '@/lib/active-restaurant'
import { setActiveRestaurant, deleteRestaurant } from '@/app/actions/restaurant'
import OrderNotificationBell from '@/components/OrderNotificationBell'
import PendingOrdersFloat from '@/components/PendingOrdersFloat'
import UrgencyBanner from '@/components/UrgencyBanner'
import { getSubscriptionStatus, isAccessGranted } from '@/lib/subscription'
import ThemeProvider from '@/components/ThemeProvider'
import ThemeToggle from '@/components/ThemeToggle'

type OpeningHours = Record<string, { open: string; close: string; closed: boolean }>
type HappyHour = { enabled: boolean; start: string; end: string; days: string[]; urgency_threshold?: number }

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function getNowParis() {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '0'
  const hour   = parseInt(get('hour')) % 24
  const minute = parseInt(get('minute'))
  const dayKey = get('weekday').toLowerCase().slice(0, 3)
  return { dayKey, mins: hour * 60 + minute }
}

function computePills(
  opening_hours: OpeningHours | null,
  happy_hour: HappyHour | null,
): { open: boolean; happyHour: boolean } {
  const { dayKey, mins } = getNowParis()

  let openNow: boolean
  if (opening_hours && opening_hours[dayKey]) {
    const { open, close, closed } = opening_hours[dayKey]
    const o = parseTime(open), c = parseTime(close)
    // Gère les horaires qui traversent minuit (ex: 12:00 → 06:00)
    openNow = !closed && (c > o ? mins >= o && mins < c : mins >= o || mins < c)
  } else {
    openNow = true
  }

  const happyHourNow =
    (happy_hour?.enabled ?? false) &&
    happy_hour!.days.includes(dayKey) &&
    mins >= parseTime(happy_hour!.start) &&
    mins < parseTime(happy_hour!.end)

  return { open: openNow, happyHour: happyHourNow }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── Vérification de l'abonnement ──────────────────────────
  const { status: subStatus, trialEndsAt } = await getSubscriptionStatus(user.id)
  if (!isAccessGranted(subStatus)) redirect('/subscribe')

  const [profileRes, { restaurants, activeId }] = await Promise.all([
    supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single(),
    getRestaurantsWithActive(user.id),
  ])

  const profile = profileRes.data
  const activeRestaurantId = activeId

  // Charger les données du restaurant actif (horaires, etc.)
  const restaurantData = activeRestaurantId
    ? await supabase
        .from('restaurants')
        .select('id, opening_hours, happy_hour')
        .eq('id', activeRestaurantId)
        .single()
        .then((r) => r.data)
    : null

  const restaurant = restaurantData

  const displayName = profile?.full_name ?? user.email?.split('@')[0] ?? 'Utilisateur'
  const email = user.email ?? ''
  const avatarUrl = profile?.avatar_url ?? user.user_metadata?.avatar_url

  const pills = restaurant
    ? computePills(
        restaurant.opening_hours as OpeningHours | null,
        restaurant.happy_hour as HappyHour | null,
      )
    : null

  const urgencyThreshold = (restaurant?.happy_hour as HappyHour | null)?.urgency_threshold ?? 5

  return (
    <ThemeProvider>
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <style>{`
        /* Couleur accent fixe backoffice */
        .bg-orange-500 { background-color: #e76f51 !important; }
        .bg-orange-400 { background-color: #eb8c74 !important; }
        .hover\\:bg-orange-500:hover { background-color: #e76f51 !important; }
        .hover\\:bg-orange-400:hover { background-color: #eb8c74 !important; }
        .active\\:bg-orange-600:active { background-color: #cf5a3c !important; }
        .bg-orange-500\\/10, .bg-orange-500\\/8, .bg-orange-500\\/15, .bg-orange-500\\/20 { background-color: #e76f5120 !important; }
        .text-orange-500 { color: #e76f51 !important; }
        .text-orange-400 { color: #eb8c74 !important; }
        .hover\\:text-orange-400:hover { color: #eb8c74 !important; }
        .hover\\:text-orange-300:hover { color: #f0a990 !important; }
        .border-orange-500 { border-color: #e76f51 !important; }
        .border-orange-500\\/30 { border-color: #e76f514d !important; }
        .border-orange-500\\/20 { border-color: #e76f5133 !important; }
        .hover\\:border-orange-500\\/50:hover { border-color: #e76f5180 !important; }
        .ring-orange-500\\/50 { --tw-ring-color: #e76f5180 !important; }
        .focus\\:ring-orange-500\\/50:focus { --tw-ring-color: #e76f5180 !important; }
        .focus\\:border-orange-500:focus { border-color: #e76f51 !important; }
        .shadow-orange-500\\/20 { --tw-shadow-color: #e76f5133 !important; }
        .ring-orange-500\\/20 { --tw-ring-color: #e76f5133 !important; }
        .from-orange-950\\/20 { --tw-gradient-from: #e76f5133 !important; }
      `}</style>
      {/* Top nav */}
      <header className="border-b border-zinc-800 bg-zinc-900 sticky top-0 z-10">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
                <IconLogo className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-sm hidden sm:block">Qomand</span>
            </Link>

            <NavDesktop />
          </div>

          <div className="flex items-center gap-3">
            {/* Happy Hour pill uniquement dans le header */}
            {pills?.happyHour && (
              <span className="hidden sm:inline-flex text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400">
                🍹 Happy Hour !
              </span>
            )}

            {restaurant && (
              <OrderNotificationBell restaurantId={restaurant.id} />
            )}

            <ThemeToggle />

            <UserMenu
              displayName={displayName}
              email={email}
              avatarUrl={avatarUrl}
              signOutAction={signOut}
              restaurants={restaurants}
              activeRestaurantId={activeRestaurantId}
              setActiveAction={setActiveRestaurant}
              deleteAction={deleteRestaurant}
              subStatus={subStatus}
              trialEndsAt={trialEndsAt?.toISOString() ?? null}
            />
          </div>
        </div>

      </header>

      {/* Bandeau d'urgence commandes */}
      {restaurant && (
        <UrgencyBanner
          restaurantId={restaurant.id}
          thresholdMinutes={urgencyThreshold}
        />
      )}

      <main className="flex-1 w-full px-4 py-8 pb-24 md:pb-8">
        {children}
      </main>

      {restaurant && (
        <PendingOrdersFloat restaurantId={restaurant.id} />
      )}

      {/* Bottom tab bar mobile */}
      <MobileNav restaurantSlug={restaurants.find((r) => r.id === activeRestaurantId)?.slug} />
    </div>
    </ThemeProvider>
  )
}

