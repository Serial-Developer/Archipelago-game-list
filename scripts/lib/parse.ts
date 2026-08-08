/**
 * Parsing et normalisation des deux onglets du sheet vers le type `Game`.
 *
 * Fonctions pures : aucune I/O, aucune date, aucun accès réseau. Tout ce qui
 * ne peut pas être déduit de la source est signalé dans `warnings` plutôt
 * qu'inventé.
 */
import type {
  AiDisclosure,
  ColumnHelpKey,
  Game,
  GameLink,
  LinkGroup,
  Stability,
} from '../../src/types.ts'
import { cellAt, cellText, type RawCell, type RawSheet } from './raw.ts'
import { assignIds } from './slug.ts'

export const COMMUNITY_SHEET = 'Playable Worlds'
export const CORE_SHEET = 'Core-Verified Worlds'

/** Libellés d'en-tête tels qu'écrits dans l'onglet « Playable Worlds ». */
const COMMUNITY_HEADERS = {
  name: 'Game',
  stability: 'Stability',
  prStatus: 'PR Status',
  adult: '18+ / Unrated',
  downloads: 'Links & Downloads',
  setup: 'Setup Guides',
  support: 'Support',
  disclosure: 'Disclosures',
  notes: 'Notes',
} as const satisfies Record<ColumnHelpKey, string>

/** Libellés d'en-tête tels qu'écrits dans l'onglet « Core-Verified Worlds ». */
const CORE_HEADERS = {
  name: 'Game',
  page: 'Game Page',
  setup: 'Setup Guide',
  support: 'Discord Channel',
} as const

/** Sans ces colonnes, l'onglet n'est pas exploitable et le run doit échouer. */
const COMMUNITY_REQUIRED = ['name', 'stability', 'adult'] as const
const CORE_REQUIRED = ['name'] as const

/** Nombre de lignes explorées pour trouver l'en-tête (elle bouge au gré des éditions). */
const HEADER_SCAN_DEPTH = 25

const STABILITES: Record<string, Stability> = {
  stable: 'stable',
  unstable: 'unstable',
  // Le sheet écrit « Broken on Main » dans les cellules et « Broken in Main »
  // dans l'info-bulle de la colonne : les deux graphies sont acceptées.
  'broken on main': 'broken',
  'broken in main': 'broken',
}

const DIVULGATIONS_IA: Record<string, AiDisclosure> = {
  unknown: 'unknown',
  none: 'none',
  consulted: 'consulted',
  minor: 'minor',
  major: 'major',
}

export interface ParseResult {
  games: Game[]
  warnings: string[]
  columnHelp: Partial<Record<ColumnHelpKey, string>>
}

interface HeaderMatch<K extends string> {
  rowIndex: number
  columns: Partial<Record<K, number>>
}

function normaliseHeader(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * Localise la ligne d'en-tête et associe chaque libellé connu à son indice de
 * colonne. L'ordre et la position des colonnes ne sont jamais supposés.
 */
export function findHeaderRow<K extends string>(
  sheet: RawSheet,
  headers: Record<K, string>,
  // `NoInfer` : les clés viennent de `headers`, pas de la liste des colonnes
  // requises — sans quoi K serait réduit aux seules colonnes obligatoires.
  required: readonly NoInfer<K>[],
): HeaderMatch<K> {
  const attendus = new Map<string, K>(
    (Object.entries(headers) as [K, string][]).map(([cle, libelle]) => [
      normaliseHeader(libelle),
      cle,
    ]),
  )

  const profondeur = Math.min(sheet.rows.length, HEADER_SCAN_DEPTH)
  for (let ligne = 0; ligne < profondeur; ligne++) {
    const columns: Partial<Record<K, number>> = {}
    const cellules = sheet.rows[ligne] ?? []
    for (let colonne = 0; colonne < cellules.length; colonne++) {
      const cle = attendus.get(normaliseHeader(cellules[colonne]!.text))
      if (cle !== undefined && columns[cle] === undefined) columns[cle] = colonne
    }
    const manquantes = required.filter((cle) => columns[cle] === undefined)
    if (manquantes.length === 0) return { rowIndex: ligne, columns }
  }

  throw new Error(
    `Onglet « ${sheet.title} » : aucune ligne d'en-tête trouvée dans les ` +
      `${profondeur} premières lignes (colonnes requises : ${required.join(', ')}). ` +
      `La structure du sheet a probablement changé.`,
  )
}

/** Récupère les commentaires d'en-tête, qui documentent chaque colonne. */
function extraireAide(
  sheet: RawSheet,
  match: HeaderMatch<ColumnHelpKey>,
): Partial<Record<ColumnHelpKey, string>> {
  const aide: Partial<Record<ColumnHelpKey, string>> = {}
  for (const [cle, colonne] of Object.entries(match.columns) as [ColumnHelpKey, number][]) {
    const note = cellAt(sheet.rows, match.rowIndex, colonne).note?.trim()
    if (note) aide[cle] = note
  }
  return aide
}

/**
 * Transforme les liens d'une cellule en `GameLink`. Une cellule sans lien ne
 * produit rien ; un lien sans libellé retombe sur le texte de la cellule.
 */
function liensDeCellule(cellule: RawCell, group: LinkGroup): GameLink[] {
  return cellule.links
    .filter((lien) => lien.url.trim() !== '')
    .map((lien) => ({
      label: lien.label.trim() || cellule.text.trim(),
      url: lien.url.trim(),
      group,
    }))
}

function normaliserStabilite(brut: string, nom: string, warnings: string[]): Stability {
  if (brut === '') return 'unknown'
  const connue = STABILITES[normaliseHeader(brut)]
  if (connue) return connue
  warnings.push(`Stabilité inconnue « ${brut} » pour « ${nom} » : classée en « unknown ».`)
  return 'unknown'
}

function normaliserDivulgation(
  brut: string,
  nom: string,
  warnings: string[],
): AiDisclosure | null {
  if (brut === '') return null
  const connue = DIVULGATIONS_IA[normaliseHeader(brut)]
  if (connue) return connue
  warnings.push(`Divulgation IA inconnue « ${brut} » pour « ${nom} » : champ laissé vide.`)
  return null
}

/**
 * La colonne « 18+ / Unrated » est une case à cocher. Chaque source la rend
 * différemment : `1`/`0` dans le XML brut, `true`/`false` via exceljs,
 * `TRUE`/`FALSE` dans le `formattedValue` de l'API. Une cellule vide est une
 * case non cochée, donc tout public.
 *
 * Toute autre valeur est traitée comme 18+ : le filtre masque ces jeux par
 * défaut, donc en cas de doute on masque.
 */
const ADULTE_VRAI = new Set(['1', 'true'])
const ADULTE_FAUX = new Set(['0', 'false', ''])

function normaliserAdulte(brut: string, nom: string, warnings: string[]): boolean {
  const valeur = brut.trim().toLowerCase()
  if (ADULTE_VRAI.has(valeur)) return true
  if (ADULTE_FAUX.has(valeur)) return false
  warnings.push(
    `Valeur « 18+ / Unrated » inattendue (${JSON.stringify(brut)}) pour « ${nom} » : ` +
      `jeu considéré comme 18+ par précaution.`,
  )
  return true
}

/** Parse l'onglet « Playable Worlds ». */
export function parseCommunitySheet(sheet: RawSheet): ParseResult {
  const warnings: string[] = []
  const match = findHeaderRow(sheet, COMMUNITY_HEADERS, COMMUNITY_REQUIRED)
  const { columns } = match

  const brutes: { name: string; ligne: number }[] = []
  for (let ligne = match.rowIndex + 1; ligne < sheet.rows.length; ligne++) {
    const nom = cellText(sheet.rows, ligne, columns.name)
    if (nom !== '') brutes.push({ name: nom, ligne })
  }

  const { ids, warnings: avertissementsIds } = assignIds(brutes.map((b) => b.name))
  warnings.push(...avertissementsIds)

  const games = brutes.map(({ name, ligne }, index): Game => {
    const lien = (cle: keyof typeof columns, group: LinkGroup): GameLink[] => {
      const colonne = columns[cle]
      return colonne === undefined ? [] : liensDeCellule(cellAt(sheet.rows, ligne, colonne), group)
    }

    return {
      id: ids[index]!,
      name,
      stability: normaliserStabilite(cellText(sheet.rows, ligne, columns.stability), name, warnings),
      prStatus: cellText(sheet.rows, ligne, columns.prStatus) || null,
      adult: normaliserAdulte(cellText(sheet.rows, ligne, columns.adult), name, warnings),
      aiDisclosure: normaliserDivulgation(
        cellText(sheet.rows, ligne, columns.disclosure),
        name,
        warnings,
      ),
      notes: cellText(sheet.rows, ligne, columns.notes) || null,
      links: [
        ...lien('downloads', 'downloads'),
        ...lien('setup', 'setup'),
        ...lien('support', 'support'),
        ...lien('disclosure', 'disclosure'),
      ],
      source: 'community',
    }
  })

  return { games, warnings, columnHelp: extraireAide(sheet, match) }
}

/**
 * Parse l'onglet « Core-Verified Worlds ».
 *
 * Cet onglet n'a ni colonne de stabilité (ces jeux sont livrés avec
 * Archipelago, d'où `stability: 'core'`), ni colonne 18+, ni colonne de
 * divulgation IA : les champs correspondants restent donc à leur valeur neutre.
 */
export function parseCoreSheet(sheet: RawSheet): ParseResult {
  const warnings: string[] = []
  const match = findHeaderRow(sheet, CORE_HEADERS, CORE_REQUIRED)
  const { columns } = match

  const brutes: { name: string; ligne: number }[] = []
  for (let ligne = match.rowIndex + 1; ligne < sheet.rows.length; ligne++) {
    const nom = cellText(sheet.rows, ligne, columns.name)
    if (nom !== '') brutes.push({ name: nom, ligne })
  }

  const { ids, warnings: avertissementsIds } = assignIds(brutes.map((b) => b.name))
  warnings.push(...avertissementsIds)

  const games = brutes.map(({ name, ligne }, index): Game => {
    const lien = (cle: keyof typeof columns, group: LinkGroup): GameLink[] => {
      const colonne = columns[cle]
      return colonne === undefined ? [] : liensDeCellule(cellAt(sheet.rows, ligne, colonne), group)
    }

    return {
      id: ids[index]!,
      name,
      stability: 'core',
      prStatus: null,
      adult: false,
      aiDisclosure: null,
      notes: null,
      links: [...lien('page', 'page'), ...lien('setup', 'setup'), ...lien('support', 'support')],
      source: 'core',
    }
  })

  return { games, warnings, columnHelp: {} }
}

/**
 * Assemble les deux onglets. Les identifiants sont réattribués sur l'ensemble
 * pour garantir leur unicité même si un jeu apparaissait dans les deux onglets
 * (ce n'est pas le cas aujourd'hui).
 */
export function parseWorkbook(sheets: RawSheet[]): ParseResult {
  const trouver = (titre: string): RawSheet => {
    const sheet = sheets.find((s) => s.title === titre)
    if (!sheet) {
      throw new Error(
        `Onglet « ${titre} » introuvable. Onglets reçus : ${sheets.map((s) => s.title).join(', ') || 'aucun'}.`,
      )
    }
    return sheet
  }

  const community = parseCommunitySheet(trouver(COMMUNITY_SHEET))
  const core = parseCoreSheet(trouver(CORE_SHEET))

  const tous = [...community.games, ...core.games]
  const { ids, warnings: avertissementsIds } = assignIds(tous.map((jeu) => jeu.name))
  const games = tous.map((jeu, index) => ({ ...jeu, id: ids[index]! }))

  return {
    games,
    // Dédoublonné : une collision interne à un onglet est déjà signalée par le
    // parseur de cet onglet, puis de nouveau par la réattribution globale.
    warnings: [...new Set([...community.warnings, ...core.warnings, ...avertissementsIds])],
    columnHelp: { ...core.columnHelp, ...community.columnHelp },
  }
}
