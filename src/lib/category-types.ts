// Configuration des types de catégories et de leurs attributs spécifiques

export const CATEGORY_TYPES = [
  { id: 'standard',  label: 'Standard',          emoji: '🍽️', description: 'Entrées, plats, accompagnements' },
  { id: 'meat',      label: 'Viandes',            emoji: '🥩', description: 'Bœuf, poulet, agneau, porc' },
  { id: 'fish',      label: 'Poissons & mer',     emoji: '🐟', description: 'Poissons, coquillages, crustacés' },
  { id: 'pizza',     label: 'Pizzas',             emoji: '🍕', description: 'Pizzas, flammekueches' },
  { id: 'burger',    label: 'Gourmands',          emoji: '🍟', description: 'Burgers, hot-dogs, sandwichs, plats bistrot' },
  { id: 'tapas',     label: 'Tapas & planches',   emoji: '🫒', description: 'Tapas, planches, petites assiettes à partager' },
  { id: 'alcohol',   label: 'Alcools',            emoji: '🍷', description: 'Vins, bières, cocktails, spiritueux' },
  { id: 'beverage',  label: 'Boissons',           emoji: '🥤', description: 'Jus, sodas, eaux, smoothies' },
  { id: 'dessert',   label: 'Desserts',           emoji: '🍰', description: 'Glaces, gâteaux, fromages' },
] as const

export type CategoryTypeId = typeof CATEGORY_TYPES[number]['id']

export type AttributeFieldDef =
  | { type: 'multiselect'; key: string; label: string; options: string[] }
  | { type: 'select';      key: string; label: string; options: string[] }
  | { type: 'slider';      key: string; label: string; min: number; max: number; step: number; unit: string }

export const CATEGORY_ATTRIBUTES: Record<CategoryTypeId, AttributeFieldDef[]> = {
  standard: [],
  meat: [
    {
      type: 'multiselect',
      key: 'cuissons',
      label: 'Cuissons proposées',
      options: ['Bleu', 'Saignant', 'À point', 'Bien cuit'],
    },
  ],
  fish: [
    {
      type: 'multiselect',
      key: 'cuissons',
      label: 'Modes de cuisson',
      options: ['Vapeur', 'Grillé', 'Poêlé', 'Cru / Tartare'],
    },
  ],
  pizza: [
    {
      type: 'multiselect',
      key: 'tailles',
      label: 'Tailles disponibles',
      options: ['S (26 cm)', 'M (30 cm)', 'L (35 cm)', 'XL (40 cm)'],
    },
  ],
  burger: [
    {
      type: 'multiselect',
      key: 'cuissons',
      label: 'Cuissons proposées',
      options: ['Rosé', 'Bien cuit'],
    },
  ],
  tapas: [],
  alcohol: [
    {
      type: 'select',
      key: 'type',
      label: 'Type de boisson',
      options: ['Vin', 'Bière', 'Cocktail', 'Spiritueux', 'Champagne / Pétillant', 'Autre'],
    },
    {
      type: 'slider',
      key: 'degre',
      label: "Degré d'alcool",
      min: 0,
      max: 70,
      step: 0.5,
      unit: '°',
    },
    {
      type: 'select',
      key: 'format',
      label: 'Format / Contenance',
      options: ['25 cl', '33 cl', '50 cl', '75 cl', '1 L'],
    },
  ],
  beverage: [
    {
      type: 'select',
      key: 'format',
      label: 'Format / Contenance',
      options: ['25 cl', '33 cl', '50 cl', '1 L'],
    },
  ],
  dessert: [
    {
      type: 'select',
      key: 'temperature',
      label: 'Température de service',
      options: ['Froid', 'Chaud', 'Ambiant'],
    },
  ],
}

export const CATEGORY_TYPE_COLORS: Record<CategoryTypeId, string> = {
  standard: 'bg-zinc-800 text-zinc-400',
  meat:     'bg-red-500/10 text-red-400',
  fish:     'bg-blue-500/10 text-blue-400',
  pizza:    'bg-yellow-500/10 text-yellow-400',
  burger:   'bg-orange-500/10 text-orange-400',
  tapas:    'bg-lime-500/10 text-lime-400',
  alcohol:  'bg-purple-500/10 text-purple-400',
  beverage: 'bg-teal-500/10 text-teal-400',
  dessert:  'bg-pink-500/10 text-pink-400',
}
