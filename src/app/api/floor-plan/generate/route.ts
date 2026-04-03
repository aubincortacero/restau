import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// ─── Schémas de validation ────────────────────────────────────
const ZoneInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  tableCount: z.number().int().min(1).max(100),
  cells: z.array(z.number().int().min(0).max(11)), // indices 0-11 dans la grille 4×3
  layout: z.enum(['grid', 'row', 'L', 'U']),
})

const RequestSchema = z.object({
  restaurantId: z.string().uuid(),
  zones: z.array(ZoneInputSchema).min(1).max(8),
})

const TableOutputSchema = z.object({
  number: z.number().int().min(1),
  label: z.string(),
  pos_x: z.number(),
  pos_y: z.number(),
})

const WallOutputSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number().min(1),
  h: z.number().min(1),
})

const OutputSchema = z.object({
  tables: z.array(TableOutputSchema),
  walls: z.array(WallOutputSchema),
})

// ─── System prompt ────────────────────────────────────────────
const SYSTEM_PROMPT = `Tu es un moteur de génération de plans de salle de restaurant.
Tu reçois une configuration de zones et tu produis un plan JSON précis.

=== CANVAS ===
Dimensions : 2000 × 1200 pixels logiques.
Grille de référence : 4 colonnes (indices col 0–3) × 3 lignes (indices row 0–2).
Cellule (col, row) = rectangle :
  x_min = col × 500
  y_min = row × 400
  x_max = x_min + 500
  y_max = y_min + 400

=== PLACEMENT DES TABLES ===
Taille d'une table : largeur 76 px, hauteur 60 px.
Espacement minimum entre centres de tables : 110 px horizontal, 95 px vertical.
Marge intérieure depuis le bord du mur de zone : 55 px.
Placement en grille régulière à l'intérieur de la bounding-box de la zone.
Commence à placer depuis x_min_zone + 55, y_min_zone + 55.
Avance de 110 px en X, de 95 px en Y.
Si la ligne dépasse le bord droit de la zone, passe à la ligne suivante.
Ne place jamais de table hors de la bounding-box de sa zone.
Si le nombre de tables demandé ne rentre pas, place autant que possible.

=== NUMÉROTATION ===
Numérotation globale, commence à 1, s'incrémente zone par zone dans l'ordre fourni.

=== MURS ===
Chaque zone produit UN mur = rectangle englobant toutes ses cellules.
Bounding-box des cellules de la zone :
  x = min(col × 500) pour toutes les cellules de la zone
  y = min(row × 400)
  w = max(col × 500 + 500) - x
  h = max(row × 400 + 400) - y
Applique un padding interne de 12 px (rétrécis le mur de 12 px de chaque côté).
id du mur = "w" + index (w1, w2, ...).

=== RÈGLES STRICTES ===
- Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans texte avant ou après.
- N'invente pas de zones, ne change pas les noms.
- pos_x et pos_y = coordonnée du coin supérieur gauche de la table.
- Toutes les valeurs numériques sont des entiers.
- Si deux zones partagent des cellules adjacentes, leurs murs peuvent se toucher mais pas se superposer.

=== FORMAT DE SORTIE ===
{
  "tables": [
    { "number": 1, "label": "NomZone", "pos_x": 67, "pos_y": 67 },
    ...
  ],
  "walls": [
    { "id": "w1", "x": 12, "y": 12, "w": 476, "h": 376 },
    ...
  ]
}`

export async function POST(req: NextRequest) {
  // Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Validation input
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  const { restaurantId, zones } = parsed.data

  // Vérifie ownership
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', restaurantId)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!restaurant) return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 403 })

  // Prépare le contexte pour Gemini
  const zonesContext = zones.map((z) => {
    const cellCoords = z.cells.map((idx) => ({
      col: idx % 4,
      row: Math.floor(idx / 4),
    }))
    const colMin = Math.min(...cellCoords.map((c) => c.col))
    const colMax = Math.max(...cellCoords.map((c) => c.col))
    const rowMin = Math.min(...cellCoords.map((c) => c.row))
    const rowMax = Math.max(...cellCoords.map((c) => c.row))
    return {
      id: z.id,
      name: z.name,
      tableCount: z.tableCount,
      layout: z.layout,
      cells: z.cells,
      boundingBox: {
        x: colMin * 500,
        y: rowMin * 400,
        w: (colMax - colMin + 1) * 500,
        h: (rowMax - rowMin + 1) * 400,
      },
    }
  })

  const userPrompt = `Génère le plan pour ce restaurant.

Zones à placer :
${JSON.stringify(zonesContext, null, 2)}

Rappel : chaque cellule fait 500×400 px. Place les tables uniquement dans la bounding-box de chaque zone.`

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent([SYSTEM_PROMPT, userPrompt])
    const text = result.response.text()

    // Extrait le JSON de la réponse (enlève éventuellement les backticks)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Réponse IA invalide' }, { status: 500 })

    const aiOutput = JSON.parse(jsonMatch[0])
    const validated = OutputSchema.safeParse(aiOutput)
    if (!validated.success) {
      console.error('[floor-plan/generate] Validation IA échouée:', validated.error)
      return NextResponse.json({ error: 'Plan généré invalide' }, { status: 500 })
    }

    return NextResponse.json(validated.data)
  } catch (err) {
    console.error('[floor-plan/generate]', err)
    return NextResponse.json({ error: 'Erreur IA' }, { status: 500 })
  }
}
