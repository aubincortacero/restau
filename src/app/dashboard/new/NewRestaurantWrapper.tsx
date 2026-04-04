'use client'

import CreateRestaurantForm from './CreateRestaurantForm'

export default function NewRestaurantWrapper({ isAdmin: _isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] py-8 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-500 mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Créer votre restaurant</h1>
          <p className="text-sm text-zinc-400 mt-1">Quelques étapes rapides pour tout configurer.</p>
        </div>
        <CreateRestaurantForm />
      </div>
    </div>
  )
}
