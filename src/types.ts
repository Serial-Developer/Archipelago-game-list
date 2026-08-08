/**
 * Types partagés entre le pipeline de données (scripts/) et le front (src/).
 *
 * Toutes ces valeurs proviennent du Google Sheet communautaire. Un champ absent
 * de la source est `null` ou un tableau vide — jamais une valeur inventée.
 */

/** Stabilité telle que déclarée par le sheet. `core` = jeu livré avec Archipelago. */
export type Stability = 'core' | 'stable' | 'unstable' | 'broken' | 'unknown'

/**
 * Rapport du projet à l'IA générative, tel que publiquement déclaré (colonne
 * « Disclosures »). Définitions données par le sheet lui-même :
 * - `unknown`   : aucune information ne renseigne le rapport à l'IA
 * - `none`      : l'IA n'a été utilisée d'aucune manière
 * - `consulted` : usage passif (questions posées, analyse de bugs…)
 * - `minor`     : IA utilisée, projet « plus humain qu'autre chose »
 * - `major`     : IA utilisée, projet « plus IA qu'autre chose »
 */
export type AiDisclosure = 'unknown' | 'none' | 'consulted' | 'minor' | 'major'

/** Colonne d'origine d'un lien, pour permettre un affichage par section. */
export type LinkGroup = 'downloads' | 'setup' | 'support' | 'disclosure' | 'page'

export interface GameLink {
  /** Libellé tel qu'écrit dans la cellule (« APWorld », « Poptracker », « Thread »…). */
  label: string
  url: string
  group: LinkGroup
}

/** Onglet d'origine. `core` = inclus dans l'installation Archipelago. */
export type GameSource = 'community' | 'core'

export interface Game {
  /** Slug dérivé du nom, stable dans le temps, unique dans le jeu de données. */
  id: string
  name: string
  stability: Stability
  /**
   * Colonne « PR Status », conservée verbatim (`Merged`, `In Review`,
   * `Not PRing`, ou `--` qui est le marqueur « sans objet » du sheet).
   * `null` uniquement si la cellule est vide.
   */
  prStatus: string | null
  /**
   * Colonne « 18+ / Unrated » : le jeu n'est pas autorisé sur le Discord
   * principal en raison de son classement. L'onglet core n'a pas cette
   * colonne, ses jeux sont donc toujours `false`.
   */
  adult: boolean
  /** `null` pour les jeux core : la colonne n'existe pas dans leur onglet. */
  aiDisclosure: AiDisclosure | null
  notes: string | null
  links: GameLink[]
  source: GameSource
}

/** Clés des info-bulles d'en-tête récupérées depuis le sheet. */
export type ColumnHelpKey =
  | 'name'
  | 'stability'
  | 'prStatus'
  | 'adult'
  | 'downloads'
  | 'setup'
  | 'support'
  | 'disclosure'
  | 'notes'

/** Comment le snapshot a été récupéré. */
export type FetchMode = 'sheets-api' | 'xlsx'

export interface Meta {
  /** Date ISO du snapshot. */
  fetchedAt: string
  fetchMode: FetchMode
  spreadsheetId: string
  counts: {
    total: number
    community: number
    core: number
  }
  /**
   * Définitions officielles des colonnes, extraites des commentaires d'en-tête
   * du sheet. Affichées telles quelles au survol des badges.
   */
  columnHelp: Partial<Record<ColumnHelpKey, string>>
}
