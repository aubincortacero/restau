'use client'

import { useState, useEffect } from 'react'
import OnboardingSlider from '@/components/OnboardingSlider'
import CreateRestaurantForm from './CreateRestaurantForm'

const STORAGE_KEY = 'qomand_onboarding_done'

export default function NewRestaurantWrapper({ isAdmin }: { isAdmin: boolean }) {
  // null = "pas encore vérifié" (SSR-safe)
  const [sliderDone, setSliderDone] = useState<boolean | null>(null)

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY) === '1'
    setSliderDone(done)
  }, [])

  function handleSliderComplete() {
    localStorage.setItem(STORAGE_KEY, '1')
    setSliderDone(true)
  }

  // Pendant l'hydratation : écran vide pour éviter le flash
  if (sliderDone === null) return null

  if (!sliderDone) {
    return <OnboardingSlider onComplete={handleSliderComplete} isAdmin={isAdmin} />
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-500 mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white">Créer votre restaurant</h1>
          <p className="text-sm text-zinc-400 mt-1">Vous pourrez modifier ces informations plus tard.</p>
        </div>

        <CreateRestaurantForm />
      </div>
    </div>
  )
}
