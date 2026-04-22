'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Logo } from './icons'
import UserMenu from './UserMenu'
import OrderNotificationBell from './OrderNotificationBell'
import MobileSidebarDrawer from './MobileSidebarDrawer'

type RestaurantSummary = { id: string; name: string; slug: string }
type SubStatus = 'active' | 'trialing' | 'expired' | 'none'

interface DashboardMobileHeaderProps {
  logoUrl: string | null
  restaurantId: string | null
  happyHour: boolean
  displayName: string
  email: string
  avatarUrl?: string | null
  signOutAction: () => Promise<void>
  restaurants: RestaurantSummary[]
  activeRestaurantId: string | null
  setActiveAction: (fd: FormData) => Promise<void>
  deleteAction: (fd: FormData) => Promise<void>
  subStatus: SubStatus
  trialEndsAt: string | null
}

export default function DashboardMobileHeader({
  logoUrl,
  restaurantId,
  happyHour,
  displayName,
  email,
  avatarUrl,
  signOutAction,
  restaurants,
  activeRestaurantId,
  setActiveAction,
  deleteAction,
  subStatus,
  trialEndsAt,
}: DashboardMobileHeaderProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  return (
    <>
      <header className="md:hidden border-b border-zinc-800 bg-zinc-900 sticky top-0 z-10 shrink-0">
        <div className="px-4 h-14 flex items-center justify-between">
          {/* Bouton hamburger */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="w-9 h-9 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
            aria-label="Ouvrir le menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {/* Logo central */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <Logo className="h-8" />
          </Link>

          {/* Actions à droite */}
          <div className="flex items-center gap-3">
            {happyHour && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400">
                🍹
              </span>
            )}
            {restaurantId && <OrderNotificationBell restaurantId={restaurantId} />}
            <UserMenu
              displayName={displayName}
              email={email}
              avatarUrl={avatarUrl}
              signOutAction={signOutAction}
              restaurants={restaurants}
              activeRestaurantId={activeRestaurantId}
              setActiveAction={setActiveAction}
              deleteAction={deleteAction}
              subStatus={subStatus}
              trialEndsAt={trialEndsAt}
            />
          </div>
        </div>
      </header>

      {/* Drawer mobile */}
      <MobileSidebarDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        logoUrl={logoUrl}
        restaurantId={restaurantId}
        happyHour={happyHour}
        displayName={displayName}
        email={email}
        avatarUrl={avatarUrl}
        signOutAction={signOutAction}
        restaurants={restaurants}
        activeRestaurantId={activeRestaurantId}
        setActiveAction={setActiveAction}
        deleteAction={deleteAction}
        subStatus={subStatus}
        trialEndsAt={trialEndsAt}
      />
    </>
  )
}
