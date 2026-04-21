'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SessionWithDetails } from '@/types/session'
import { SessionStatusCard } from './SessionStatusCard'
import { PartialPaymentModal } from './PartialPaymentModal'
import { getSessionDetails, getActiveTableSession } from '@/app/actions/sessions'

type ClientSessionWrapperProps = {
  restaurantId: string
  tableId: string
  slug: string
}

export function ClientSessionWrapper({
  restaurantId,
  tableId,
  slug,
}: ClientSessionWrapperProps) {
  const [session, setSession] = useState<SessionWithDetails | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [showPayPartialModal, setShowPayPartialModal] = useState(false)
  const [showPayAllModal, setShowPayAllModal] = useState(false)
  const router = useRouter()

  const loadSession = async (isInitial = false) => {
    console.log('[ClientSessionWrapper] loadSession called', { restaurantId, tableId, isInitial })
    // Récupérer la session active (sans créer si elle n'existe pas)
    const { session: tableSession } = await getActiveTableSession(restaurantId, tableId)
    console.log('[ClientSessionWrapper] getActiveTableSession result:', tableSession)
    
    if (tableSession) {
      // Charger les détails complets
      const details = await getSessionDetails(tableSession.id)
      console.log('[ClientSessionWrapper] getSessionDetails result:', details)
      setSession(details)
    } else {
      console.log('[ClientSessionWrapper] No active session found')
      setSession(null)
    }
    
    if (isInitial) {
      setIsInitialLoading(false)
    }
  }

  useEffect(() => {
    loadSession(true)
    // Recharger toutes les 30 secondes pour avoir les updates en temps réel
    const interval = setInterval(() => loadSession(false), 30000)
    
    // Écouter l'événement de nouvelle commande pour refresh immédiat
    const handleOrderPlaced = () => {
      console.log('[ClientSessionWrapper] order-placed event received')
      loadSession(false)
    }
    window.addEventListener('order-placed', handleOrderPlaced)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('order-placed', handleOrderPlaced)
    }
  }, [restaurantId, tableId])

  if (isInitialLoading) {
    return (
      <div className="max-w-lg mx-auto px-5 py-4">
        <div className="bg-zinc-900 rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-zinc-800 rounded w-1/3 mb-2"></div>
          <div className="h-6 bg-zinc-800 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  if (!session) return null

  // Si la session n'a pas encore de commandes, ne rien afficher
  if (session.orders.length === 0) return null

  const handleOrderMore = () => {
    // Scroll vers le menu ou refresh pour voir le panier
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePayAll = () => {
    setShowPayAllModal(true)
  }

  return (
    <>
      <div className="max-w-lg mx-auto px-5 py-4">
        <SessionStatusCard
          session={session}
          onPayPartial={() => setShowPayPartialModal(true)}
          onPayAll={handlePayAll}
          onOrderMore={handleOrderMore}
        />
      </div>

      {/* Modal paiement partiel */}
      <PartialPaymentModal
        session={session}
        isOpen={showPayPartialModal}
        onClose={() => setShowPayPartialModal(false)}
        onSuccess={loadSession}
      />

      {/* Modal paiement total (TODO: créer composant séparé ou réutiliser PartialPaymentModal avec tous les items sélectionnés) */}
      {showPayAllModal && (
        <PartialPaymentModal
          session={session}
          isOpen={showPayAllModal}
          onClose={() => setShowPayAllModal(false)}
          onSuccess={loadSession}
        />
      )}
    </>
  )
}
