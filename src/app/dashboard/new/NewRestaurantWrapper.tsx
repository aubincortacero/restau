'use client'

import CreateRestaurantForm from './CreateRestaurantForm'

export default function NewRestaurantWrapper({ isAdmin: _isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] py-8 px-4">
      <div className="w-full max-w-md">
        <CreateRestaurantForm />
      </div>
    </div>
  )
}
