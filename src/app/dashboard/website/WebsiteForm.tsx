'use client'

import { useState, useRef } from 'react'
import { updateWebsiteContent } from '@/app/actions/restaurant'

type TeamMember = { name: string; role: string; bio: string }

interface Props {
  restaurantId: string
  initial: {
    about_description?: string | null
    about_image_url?: string | null
    team_members?: TeamMember[] | null
    contact_phone?: string | null
    contact_email?: string | null
    contact_address?: string | null
  }
  saved: boolean
}

const INPUT = "w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
const TEXTAREA = "w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 resize-none"

export default function WebsiteForm({ restaurantId, initial, saved }: Props) {
  const [aboutDesc, setAboutDesc] = useState(initial.about_description ?? '')
  const [aboutPreview, setAboutPreview] = useState<string | null>(initial.about_image_url ?? null)
  const [team, setTeam] = useState<TeamMember[]>(initial.team_members ?? [])
  const [contactPhone, setContactPhone] = useState(initial.contact_phone ?? '')
  const [contactEmail, setContactEmail] = useState(initial.contact_email ?? '')
  const [contactAddress, setContactAddress] = useState(initial.contact_address ?? '')
  const imgInputRef = useRef<HTMLInputElement>(null)

  function addMember() {
    setTeam(prev => [...prev, { name: '', role: '', bio: '' }])
  }

  function removeMember(i: number) {
    setTeam(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateMember(i: number, field: keyof TeamMember, value: string) {
    setTeam(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m))
  }

  return (
    <form action={updateWebsiteContent} className="space-y-8">
      <input type="hidden" name="id" value={restaurantId} />
      <input type="hidden" name="team_members" value={JSON.stringify(team)} />

      {/* Section : À propos */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
        <h2 className="text-sm font-semibold text-white">À propos</h2>

        {/* Photo */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">Photo de la section</label>
          <div
            className="relative w-full h-40 rounded-xl overflow-hidden border-2 border-dashed border-zinc-700 hover:border-zinc-500 cursor-pointer transition-colors group"
            onClick={() => imgInputRef.current?.click()}
          >
            {aboutPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={aboutPreview} alt="À propos" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-600 group-hover:text-zinc-400 transition-colors">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
                <span className="text-xs">Cliquer pour ajouter une photo</span>
              </div>
            )}
            {aboutPreview && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs font-medium bg-black/50 px-3 py-1.5 rounded-lg">Changer</span>
              </div>
            )}
          </div>
          <input
            ref={imgInputRef}
            type="file"
            name="about_image"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) setAboutPreview(URL.createObjectURL(file))
            }}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
          <textarea
            name="about_description"
            value={aboutDesc}
            onChange={e => setAboutDesc(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Bienvenue chez nous ! Depuis 2010, nous proposons une cuisine authentique…"
            className={TEXTAREA}
          />
          <p className="text-xs text-zinc-600 mt-1 text-right">{aboutDesc.length}/1000</p>
        </div>
      </div>

      {/* Section : Équipe */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Équipe</h2>
          <button
            type="button"
            onClick={addMember}
            className="flex items-center gap-1.5 text-xs font-medium text-orange-400 hover:text-orange-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Ajouter un membre
          </button>
        </div>

        {team.length === 0 && (
          <p className="text-xs text-zinc-600 text-center py-4">Aucun membre d&apos;équipe ajouté</p>
        )}

        {team.map((member, i) => (
          <div key={i} className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-zinc-400">Membre {i + 1}</p>
              <button
                type="button"
                onClick={() => removeMember(i)}
                className="text-zinc-600 hover:text-red-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Nom</label>
                <input
                  type="text"
                  value={member.name}
                  onChange={e => updateMember(i, 'name', e.target.value)}
                  placeholder="Jean Martin"
                  className={INPUT}
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Rôle</label>
                <input
                  type="text"
                  value={member.role}
                  onChange={e => updateMember(i, 'role', e.target.value)}
                  placeholder="Chef cuisinier"
                  className={INPUT}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Bio courte</label>
              <input
                type="text"
                value={member.bio}
                onChange={e => updateMember(i, 'bio', e.target.value)}
                placeholder="Passionné de cuisine depuis 20 ans…"
                maxLength={200}
                className={INPUT}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Section : Contact */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white">Contact</h2>
        <p className="text-xs text-zinc-500">Ces informations seront affichées sur la page «&nbsp;À propos&nbsp;» de votre menu.</p>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Téléphone</label>
          <input
            name="contact_phone"
            type="tel"
            value={contactPhone}
            onChange={e => setContactPhone(e.target.value)}
            placeholder="01 23 45 67 89"
            className={INPUT}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email</label>
          <input
            name="contact_email"
            type="email"
            value={contactEmail}
            onChange={e => setContactEmail(e.target.value)}
            placeholder="contact@monrestaurant.fr"
            className={INPUT}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Adresse complète</label>
          <input
            name="contact_address"
            type="text"
            value={contactAddress}
            onChange={e => setContactAddress(e.target.value)}
            placeholder="12 rue de la Paix, 75001 Paris"
            className={INPUT}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
        >
          Enregistrer
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Enregistré
          </span>
        )}
      </div>
    </form>
  )
}
