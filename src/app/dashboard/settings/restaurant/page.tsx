import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveRestaurantId } from '@/lib/active-restaurant'
import { PaymentMethodsForm, FulfillmentModesForm } from './PaymentSettingsForm'
import RestaurantInfoForm from './RestaurantInfoForm'

export default async function SettingsRestaurantPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const activeRestaurantId = await getActiveRestaurantId(user.id)

  const { data: restaurant } = activeRestaurantId
    ? await supabase.from('restaurants').select('id, name, slug, address, phone, accepted_payment_methods, fulfillment_modes').eq('id', activeRestaurantId).maybeSingle()
    : { data: null }

  if (!restaurant) redirect('/dashboard/new')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <RestaurantInfoForm
        restaurantId={restaurant.id}
        slug={restaurant.slug}
        initial={{
          name: restaurant.name ?? '',
          address: restaurant.address ?? '',
          phone: restaurant.phone ?? '',
        }}
      />

      <PaymentMethodsForm
        restaurantId={restaurant.id}
        initial={restaurant.accepted_payment_methods ?? ['online', 'cash']}
      />

      <FulfillmentModesForm
        restaurantId={restaurant.id}
        initial={(restaurant.fulfillment_modes as string[] | null) ?? ['table']}
      />

    </div>
  )
}
