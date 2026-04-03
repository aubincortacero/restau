'use client'

import { useState } from 'react'

const SLIDES = [
  {
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="60" cy="60" r="56" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5"/>
        <circle cx="60" cy="60" r="36" fill="#27272a"/>
        {/* Fourchette */}
        <line x1="52" y1="38" x2="52" y2="82" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="48" y1="38" x2="48" y2="52" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="56" y1="38" x2="56" y2="52" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M48 52 Q52 58 56 52" stroke="#f97316" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        {/* Couteau */}
        <path d="M68 38 L68 55 Q72 60 72 65 L72 82" stroke="#a1a1aa" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M68 38 Q74 44 72 55" stroke="#a1a1aa" strokeWidth="2" fill="none"/>
        {/* Assiette */}
        <ellipse cx="60" cy="76" rx="18" ry="5" fill="none" stroke="#52525b" strokeWidth="1.5"/>
      </svg>
    ),
    title: 'Bienvenue sur Qomand',
    subtitle: 'Votre restaurant passe au digital. Menus, tables, commandes et paiements — tout depuis un simple QR code posé sur vos tables.',
  },
  {
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="60" cy="60" r="56" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5"/>
        {/* Carte bancaire */}
        <rect x="22" y="38" width="76" height="48" rx="8" fill="#27272a" stroke="#3f3f46" strokeWidth="1.5"/>
        <rect x="22" y="50" width="76" height="12" fill="#f97316" opacity="0.3"/>
        <rect x="32" y="68" width="24" height="8" rx="3" fill="#f97316" opacity="0.7"/>
        <circle cx="82" cy="72" r="8" fill="#52525b"/>
        <circle cx="90" cy="72" r="8" fill="#f97316" opacity="0.6"/>
        {/* Signal wifi/sans contact */}
        <path d="M60 28 Q70 21 80 28" stroke="#f97316" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.4"/>
        <path d="M63 32 Q70 27 77 32" stroke="#f97316" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6"/>
        <circle cx="70" cy="36" r="2" fill="#f97316"/>
      </svg>
    ),
    title: 'Connectez vos paiements',
    subtitle: 'Reliez votre compte Stripe pour accepter les paiements par carte directement à table. Vos fonds arrivent sur votre IBAN sous 2 jours.',
  },
  {
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="60" cy="60" r="56" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5"/>
        {/* Tables */}
        <rect x="28" y="44" width="26" height="18" rx="4" fill="#27272a" stroke="#f97316" strokeWidth="1.5"/>
        <rect x="66" y="44" width="26" height="18" rx="4" fill="#27272a" stroke="#52525b" strokeWidth="1.5"/>
        <rect x="28" y="72" width="26" height="18" rx="4" fill="#27272a" stroke="#52525b" strokeWidth="1.5"/>
        <rect x="66" y="72" width="26" height="18" rx="4" fill="#27272a" stroke="#52525b" strokeWidth="1.5"/>
        {/* Labels */}
        <text x="41" y="57" textAnchor="middle" fill="#f97316" fontSize="8" fontWeight="bold">T1</text>
        <text x="79" y="57" textAnchor="middle" fill="#71717a" fontSize="8">T2</text>
        <text x="41" y="85" textAnchor="middle" fill="#71717a" fontSize="8">T3</text>
        <text x="79" y="85" textAnchor="middle" fill="#71717a" fontSize="8">T4</text>
        {/* QR mini sur T1 */}
        <rect x="33" y="46" width="6" height="6" rx="1" fill="#f97316" opacity="0.4"/>
      </svg>
    ),
    title: 'Dessinez votre salle',
    subtitle: 'Créez votre plan de tables en quelques clics. Chaque table obtient un QR code unique que vos clients scannent pour commander.',
  },
  {
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="60" cy="60" r="56" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5"/>
        {/* Livre menu */}
        <rect x="34" y="28" width="52" height="64" rx="5" fill="#27272a" stroke="#3f3f46" strokeWidth="1.5"/>
        <rect x="34" y="28" width="6" height="64" rx="3" fill="#f97316" opacity="0.6"/>
        {/* Lignes contenu */}
        <rect x="46" y="40" width="30" height="3" rx="1.5" fill="#52525b"/>
        <rect x="46" y="48" width="22" height="2" rx="1" fill="#3f3f46"/>
        <rect x="46" y="56" width="30" height="3" rx="1.5" fill="#52525b"/>
        <rect x="46" y="64" width="18" height="2" rx="1" fill="#3f3f46"/>
        <rect x="46" y="72" width="30" height="3" rx="1.5" fill="#52525b"/>
        <rect x="46" y="80" width="24" height="2" rx="1" fill="#3f3f46"/>
        {/* Badge prix */}
        <rect x="64" y="45" width="16" height="8" rx="3" fill="#f97316" opacity="0.8"/>
        <text x="72" y="51" textAnchor="middle" fill="white" fontSize="5" fontWeight="bold">12€</text>
      </svg>
    ),
    title: 'Configurez votre menu',
    subtitle: 'Ajoutez vos catégories, plats et prix. Gérez les allergènes, les options et les prix happy hour. Modifiable à tout moment.',
  },
  {
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="60" cy="60" r="56" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5"/>
        {/* QR code stylisé */}
        <rect x="30" y="30" width="24" height="24" rx="3" fill="#27272a" stroke="#f97316" strokeWidth="1.5"/>
        <rect x="35" y="35" width="14" height="14" rx="1.5" fill="#f97316" opacity="0.3"/>
        <rect x="38" y="38" width="8" height="8" rx="1" fill="#f97316"/>
        <rect x="66" y="30" width="24" height="24" rx="3" fill="#27272a" stroke="#f97316" strokeWidth="1.5"/>
        <rect x="71" y="35" width="14" height="14" rx="1.5" fill="#f97316" opacity="0.3"/>
        <rect x="74" y="38" width="8" height="8" rx="1" fill="#f97316"/>
        <rect x="30" y="66" width="24" height="24" rx="3" fill="#27272a" stroke="#f97316" strokeWidth="1.5"/>
        <rect x="35" y="71" width="14" height="14" rx="1.5" fill="#f97316" opacity="0.3"/>
        <rect x="38" y="74" width="8" height="8" rx="1" fill="#f97316"/>
        {/* Checkmark bottom-right */}
        <circle cx="79" cy="79" r="16" fill="#22c55e" opacity="0.15"/>
        <circle cx="79" cy="79" r="12" fill="#16a34a" opacity="0.3"/>
        <path d="M73 79 L77 83 L85 74" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'C\'est parti !',
    subtitle: 'Imprimez vos QR codes, posez-les sur les tables et commencez à recevoir vos premières commandes en quelques minutes.',
  },
]

interface Props {
  onComplete: () => void
  isAdmin?: boolean
}

export default function OnboardingSlider({ onComplete, isAdmin = false }: Props) {
  const [current, setCurrent] = useState(0)

  const slide = SLIDES[current]
  const isLast = current === SLIDES.length - 1

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">
      {/* Barre de progression */}
      <div className="flex gap-1.5 px-6 pt-8 pb-0">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= current ? 'bg-orange-500' : 'bg-zinc-800'
            }`}
          />
        ))}
      </div>

      {/* Contenu du slide */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-4">
        {/* Illustration */}
        <div className="w-44 h-44 mb-8">
          {slide.icon}
        </div>

        {/* Numéro */}
        <span className="text-xs font-medium text-orange-500/70 tracking-widest uppercase mb-3">
          {current + 1} / {SLIDES.length}
        </span>

        {/* Titre */}
        <h2 className="text-2xl font-extrabold text-white text-center mb-3 leading-tight">
          {slide.title}
        </h2>

        {/* Sous-titre */}
        <p className="text-zinc-400 text-center text-sm leading-relaxed max-w-xs">
          {slide.subtitle}
        </p>
      </div>

      {/* Actions */}
      <div className="px-6 pb-10 space-y-3">
        <button
          onClick={() => isLast ? onComplete() : setCurrent((c) => c + 1)}
          className="w-full bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold py-4 rounded-2xl text-base transition-colors flex items-center justify-center gap-2"
        >
          {isLast ? (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
              Créer mon restaurant
            </>
          ) : (
            <>
              Suivant
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </>
          )}
        </button>

        {!isLast && (
          <button
            onClick={onComplete}
            className="w-full text-zinc-500 hover:text-zinc-300 text-sm py-2 transition-colors"
          >
            Passer l&apos;introduction
          </button>
        )}

        {/* Bouton admin */}
        {isAdmin && (
          <button
            onClick={onComplete}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors mt-2"
          >
            <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
            </svg>
            Passer (admin)
          </button>
        )}
      </div>
    </div>
  )
}
