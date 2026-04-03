import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
 
// ─── Schéma de sortie attendu de l'IA ─────────────────────────
const ItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  price: z.number().nonnegative(),
  confidence: z.enum(['high', 'low']),
})

const CategorySchema = z.object({
  name: z.string().min(1),
  category_type: z.enum([
    'standard', 'meat', 'fish', 'pizza', 'burger',
    'tapas', 'alcohol', 'beverage', 'dessert',
  ]),
  is_new_type: z.boolean().optional().default(false),
  items: z.array(ItemSchema),
})

const ScanResultSchema = z.object({
  categories: z.array(CategorySchema),
  low_confidence_items: z.array(z.string()).optional().default([]),
})

export type ScanResult = z.infer<typeof ScanResultSchema>

const SYSTEM_PROMPT = `Tu es un assistant spécialisé dans l'analyse de menus de restaurant.
Analyse l'image fournie et extrais TOUS les éléments du menu.

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans explication.

Structure attendue :
{
  "categories": [
    {
      "name": "Nom de la catégorie tel qu'il apparaît sur le menu",
      "category_type": "un des types listés ci-dessous",
      "is_new_type": false,
      "items": [
        {
          "name": "Nom du plat",
          "description": "Description si visible, sinon chaîne vide",
          "price": 12.50,
          "confidence": "high"
        }
      ]
    }
  ],
  "low_confidence_items": ["Nom item 1", "Nom item 2"]
}

Types de catégories disponibles (utilise le plus approprié) :
- "standard" : Entrées, plats du jour, accompagnements
- "meat" : Viandes, grillades
- "fish" : Poissons, fruits de mer
- "pizza" : Pizzas, flammekueches
- "burger" : Burgers, sandwichs, hot-dogs
- "tapas" : Tapas, planches, petites assiettes à partager
- "alcohol" : Vins, bières, cocktails, spiritueux (ex: Piña Colada → alcohol)
- "beverage" : Jus, sodas, eaux, cafés, thés
- "dessert" : Desserts, glaces, fromages

Règles importantes :
- Si tu n'arrives pas à lire un prix clairement, mets 0 et passe le confidence à "low"
- Si un nom de plat est illisible ou ambigu, inclus-le quand même avec confidence "low" et ajoute son nom dans "low_confidence_items"
- Ne crash jamais — une réponse partielle vaut mieux que rien
- Regroupe les plats dans leurs catégories logiques même si le menu ne les sépare pas explicitement
- Pour les cocktails, apéritifs, vins, bières : utilise toujours "alcohol"
- Pour café, thé, eau, jus : utilise "beverage"
`

export async function POST(req: NextRequest) {
  // Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  // Récupérer l'image
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  }

  const file = formData.get('image') as File | null
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'Image manquante' }, { status: 400 })
  }

  // Limite taille : 10 Mo
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image trop volumineuse (max 10 Mo)' }, { status: 400 })
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Format non supporté (JPEG, PNG, WEBP acceptés)' }, { status: 400 })
  }

  // Convertir en base64 pour Gemini
  const buffer = await file.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const result = await model.generateContent([
      SYSTEM_PROMPT,
      {
        inlineData: {
          mimeType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
          data: base64,
        },
      },
    ])

    const text = result.response.text().trim()

    // Nettoyer le markdown si Gemini l'ajoute malgré l'instruction
    const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Réponse IA non analysable. Réessayez.' }, { status: 502 })
    }

    const validated = ScanResultSchema.safeParse(parsed)
    if (!validated.success) {
      // Tentative de récupération partielle — on retourne quand même ce qu'on peut
      return NextResponse.json({ error: 'Structure inattendue', raw: parsed }, { status: 422 })
    }

    return NextResponse.json(validated.data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: `Erreur Gemini : ${message}` }, { status: 502 })
  }
}
