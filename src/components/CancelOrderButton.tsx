'use client'

import { useState } from 'react'

interface CancelOrderButtonProps {
  orderId: string
  onCancel: (formData: FormData) => Promise<void>
}

export function CancelOrderButton({ orderId, onCancel }: CancelOrderButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClick = async () => {
    const confirmed = window.confirm(
      '⚠️ Voulez-vous vraiment annuler et archiver cette commande ?\n\nCette action est définitive.'
    )
    
    if (!confirmed) return

    setIsSubmitting(true)
    const formData = new FormData()
    formData.append('id', orderId)
    
    try {
      await onCancel(formData)
    } catch (error) {
      console.error('Error canceling order:', error)
      setIsSubmitting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isSubmitting}
      className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
      {isSubmitting ? 'Annulation...' : 'Annuler et archiver'}
    </button>
  )
}
