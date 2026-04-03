import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SchedulesForm from '@/components/SchedulesForm'

type DaySchedule = { open: string; close: string; closed: boolean }
type OpeningHours = Record<string, DaySchedule>
type HappyHour = { enabled: boolean; start: string; end: string; days: string[]; urgency_threshold?: number }

export default async function SettingsSchedulesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // On récupère d'abord les champs de base garantis d'exister
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!restaurant) redirect('/dashboard/new')

  // Les colonnes opening_hours / happy_hour peuvent ne pas encore exister (migration à appliquer)
  const { data: schedData } = await supabase
    .from('restaurants')
    .select('opening_hours, happy_hour')
    .eq('id', restaurant.id)
    .single()

  const opening_hours = (schedData?.opening_hours as OpeningHours | null) ?? {}
  const happy_hour = (schedData?.happy_hour as HappyHour | null) ?? { enabled: false, start: '17:00', end: '19:00', days: [] }

  return (
    <SchedulesForm
      restaurantId={restaurant.id}
      opening_hours={opening_hours}
      happy_hour={happy_hour}
      urgencyThreshold={happy_hour.urgency_threshold ?? 5}
    />
  )
}
