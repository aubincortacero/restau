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

const COLLAPSED_KEY = 'sidebar_collapsed'

interface SidebarProps {
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

export default function DashboardSidebar({
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
}: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSED_KEY)
    if (stored === 'true') setCollapsed(true)
    setMounted(true)
  }, [])

  function toggle() {
    setCollapsed(prev => {
      localStorage.setItem(COLLAPSED_KEY, String(!prev))
      return !prev
    })
  }

  function isActive(href: string, exact?: boolean) {
    if (!mounted) return false
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 bg-zinc-900 border-r border-zinc-800 transition-all duration-200 ${
        collapsed ? 'w-14' : 'w-52'
      }`}
      style={{ minHeight: '100dvh', position: 'sticky', top: 0 }}
    >
      {/* Logo + collapse toggle */}
      <div className={`flex items-center border-b border-zinc-800 shrink-0 ${collapsed ? 'h-14 justify-center' : 'px-4 justify-between'}`}>
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center py-2">
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
        )}
        <button
          onClick={toggle}
          className={`w-7 h-7 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 flex items-center justify-center transition-colors cursor-pointer ${collapsed ? '' : ''}`}
          title={collapsed ? 'Développer' : 'Réduire'}
        >
          <svg className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
      </div>

      {/* Profile section */}
      <div className={`border-b border-zinc-800 shrink-0 ${collapsed ? 'py-3 flex flex-col items-center gap-2' : 'px-3 py-3'}`}>
        {collapsed ? (
          <>
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
              compact
              dropdownAlign="left"
            />
            {restaurantId && <OrderNotificationBell restaurantId={restaurantId} />}
          </>
        ) : (
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
        )}
      </div>

      {/* Nav principale */}
      <nav className="flex-1 py-3 flex flex-col gap-0.5 px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 rounded-lg transition-colors ${
                collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2'
              } ${
                active
                  ? 'bg-white/8 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Icon className={`shrink-0 ${collapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
              {!collapsed && (
                <span className="text-sm font-medium truncate">{label}</span>
              )}
              {!collapsed && active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/40 shrink-0" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Paramètres en bas */}
      <div className="py-3 px-2 border-t border-zinc-800 flex flex-col gap-0.5">
        {BOTTOM_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 rounded-lg transition-colors ${
                collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2'
              } ${
                active
                  ? 'bg-white/8 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Icon className={`shrink-0 ${collapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
              {!collapsed && (
                <span className="text-sm font-medium">{label}</span>
              )}
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
