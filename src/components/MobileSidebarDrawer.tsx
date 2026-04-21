'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import UserMenu from './UserMenu'
import OrderNotificationBell from './OrderNotificationBell'
import {
  IconHome, IconMenu, IconTable, IconOrders,
  IconGlobe, IconSettings,
} from './icons'

type RestaurantSummary = { id: string; name: string; slug: string }
type SubStatus = 'active' | 'trialing' | 'expired' | 'none'

const NAV_ITEMS = [
  { href: '/dashboard',         label: 'Accueil',    icon: IconHome,     exact: true },
  { href: '/dashboard/menu',    label: 'Menu',       icon: IconMenu },
  { href: '/dashboard/tables',  label: 'Tables',     icon: IconTable },
  { href: '/dashboard/website', label: 'Site web',   icon: IconGlobe },
  { href: '/dashboard/orders',  label: 'Commandes',  icon: IconOrders },
]

const BOTTOM_ITEMS = [
  { href: '/dashboard/settings', label: 'Paramètres', icon: IconSettings },
]

interface MobileSidebarDrawerProps {
  isOpen: boolean
  onClose: () => void
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

export default function MobileSidebarDrawer({
  isOpen,
  onClose,
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
}: MobileSidebarDrawerProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Fermer quand on change de page
  useEffect(() => {
    onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  function isActive(href: string, exact?: boolean) {
    if (!mounted) return false
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 bottom-0 w-72 bg-zinc-900 border-r border-zinc-800 z-50 transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo + close button */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <Link href="/dashboard" className="flex items-center">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Logo restaurant"
                height={60}
                width={0}
                style={{ height: '60px', width: 'auto' }}
                className="object-contain"
                unoptimized
              />
            ) : (
              <span className="font-semibold text-sm">Qomand</span>
            )}
          </Link>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Profile section */}
        <div className="border-b border-zinc-800 px-3 py-3 shrink-0">
          <div className="flex items-center gap-1">
            <div className="flex-1 min-w-0">
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
                dropdownAlign="left"
              />
            </div>
            {restaurantId && <OrderNotificationBell restaurantId={restaurantId} />}
            {happyHour && (
              <span className="shrink-0 text-xs px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">🍹</span>
            )}
          </div>
        </div>

        {/* Nav principale */}
        <nav className="flex-1 py-3 flex flex-col gap-0.5 px-2 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                  active
                    ? 'bg-white/8 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Icon className="shrink-0 w-5 h-5" />
                <span className="text-sm font-medium truncate">{label}</span>
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/40 shrink-0" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Paramètres en bas */}
        <div className="py-3 px-2 border-t border-zinc-800 flex flex-col gap-0.5 shrink-0">
          {BOTTOM_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                  active
                    ? 'bg-white/8 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Icon className="shrink-0 w-5 h-5" />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            )
          })}

          {/* Bouton relance du guide de démarrage */}
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('tutorial:start'))
              onClose()
            }}
            className="flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800"
          >
            <svg
              className="shrink-0 w-5 h-5"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
            </svg>
            <span className="text-xs font-medium">Guide de démarrage</span>
          </button>
        </div>
      </aside>
    </>
  )
}
