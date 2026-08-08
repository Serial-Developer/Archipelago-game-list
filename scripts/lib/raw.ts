/**
 * Représentation neutre d'une feuille de calcul.
 *
 * Les deux sources (API Sheets v4 et export xlsx) sont converties vers cette
 * structure, ce qui permet au parsing d'être écrit une seule fois et testé
 * sans réseau.
 */

export interface RawLink {
  label: string
  url: string
}

export interface RawCell {
  /** Valeur affichée de la cellule (`formattedValue` côté API). */
  text: string
  /**
   * Tous les liens portés par la cellule. L'API v4 en rend plusieurs par
   * cellule ; l'export xlsx n'en conserve qu'un seul (voir xlsx.ts).
   */
  links: RawLink[]
  /** Commentaire attaché à la cellule, utilisé pour les info-bulles d'en-tête. */
  note: string | null
}

export interface RawSheet {
  title: string
  /** Matrice dense : `rows[ligne][colonne]`, indices 0-based. */
  rows: RawCell[][]
}

export const EMPTY_CELL: RawCell = { text: '', links: [], note: null }

export function cellAt(rows: RawCell[][], row: number, col: number): RawCell {
  return rows[row]?.[col] ?? EMPTY_CELL
}

/** Texte d'une cellule, espaces superflus retirés. */
export function cellText(rows: RawCell[][], row: number, col: number | undefined): string {
  if (col === undefined) return ''
  return cellAt(rows, row, col).text.trim()
}
