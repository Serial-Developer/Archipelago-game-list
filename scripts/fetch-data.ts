/**
 * Pipeline de données : Google Sheet → public/data/games.json + meta.json
 *
 * Lancé par `npm run fetch-data`, en local comme dans GitHub Actions.
 * Source principale : API Sheets v4 si `GOOGLE_SHEETS_API_KEY` est définie.
 * Repli : export xlsx public, qui perd les liens secondaires des cellules.
 *
 * Le script échoue sans rien écrire dès que quelque chose cloche : mieux vaut
 * un site figé sur le dernier bon snapshot qu'un site rempli de vide.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { FetchMode, Game, Meta } from '../src/types.ts'
import { verifierVolume } from './lib/guards.ts'
import { COMMUNITY_SHEET, CORE_SHEET, parseWorkbook } from './lib/parse.ts'
import { fetchViaSheetsApi } from './lib/sheets-api.ts'
import { fetchViaXlsx } from './lib/xlsx.ts'

export const SPREADSHEET_ID = '1iuzDTOAvdoNe8Ne8i461qGNucg5OuEoF-Ikqs8aUQZw'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIER_DONNEES = resolve(RACINE, 'public/data')
const FICHIER_JEUX = resolve(DOSSIER_DONNEES, 'games.json')
const FICHIER_META = resolve(DOSSIER_DONNEES, 'meta.json')

/** Nombre de jeux du snapshot précédent, ou `null` au tout premier run. */
async function comptePrecedent(): Promise<number | null> {
  try {
    const brut = await readFile(FICHIER_JEUX, 'utf8')
    const jeux = JSON.parse(brut) as unknown
    return Array.isArray(jeux) ? jeux.length : null
  } catch {
    return null
  }
}

async function ecrireJson(chemin: string, contenu: unknown): Promise<void> {
  await writeFile(chemin, `${JSON.stringify(contenu, null, 2)}\n`, 'utf8')
}

function resume(games: Game[]): string {
  const parStabilite = new Map<string, number>()
  for (const jeu of games) {
    parStabilite.set(jeu.stability, (parStabilite.get(jeu.stability) ?? 0) + 1)
  }
  const detail = [...parStabilite.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cle, n]) => `${cle} ${n}`)
    .join(', ')
  const adultes = games.filter((jeu) => jeu.adult).length
  return `${games.length} jeux (${detail}) — dont ${adultes} marqués 18+/Unrated`
}

async function main(): Promise<void> {
  const cle = process.env.GOOGLE_SHEETS_API_KEY?.trim()
  const mode: FetchMode = cle ? 'sheets-api' : 'xlsx'
  const titres = [COMMUNITY_SHEET, CORE_SHEET]

  if (mode === 'sheets-api') {
    console.log('Source : API Google Sheets v4 (tous les liens de chaque cellule).')
  } else {
    console.warn(
      'Source : export xlsx (GOOGLE_SHEETS_API_KEY absente).\n' +
        '  Attention : seul le premier lien de chaque cellule sera récupéré.',
    )
  }

  const feuilles =
    mode === 'sheets-api'
      ? await fetchViaSheetsApi(SPREADSHEET_ID, cle!, titres)
      : await fetchViaXlsx(SPREADSHEET_ID, titres)

  const { games, warnings, columnHelp } = parseWorkbook(feuilles)

  for (const avertissement of warnings) console.warn(`  ! ${avertissement}`)

  if (Object.keys(columnHelp).length === 0) {
    console.warn(
      "  ! Aucune info-bulle d'en-tête récupérée : meta.columnHelp sera vide.\n" +
        '    Attendu en mode xlsx (exceljs ne sait pas lire les commentaires des exports Google).',
    )
  }

  verifierVolume(games, await comptePrecedent())

  const meta: Meta = {
    fetchedAt: new Date().toISOString(),
    fetchMode: mode,
    spreadsheetId: SPREADSHEET_ID,
    counts: {
      total: games.length,
      community: games.filter((jeu) => jeu.source === 'community').length,
      core: games.filter((jeu) => jeu.source === 'core').length,
    },
    columnHelp,
  }

  await mkdir(DOSSIER_DONNEES, { recursive: true })
  await ecrireJson(FICHIER_JEUX, games)
  await ecrireJson(FICHIER_META, meta)

  console.log(resume(games))
  console.log(`Écrit : ${FICHIER_JEUX}`)
  console.log(`Écrit : ${FICHIER_META}`)
}

main().catch((erreur: unknown) => {
  console.error(`Échec du pipeline : ${erreur instanceof Error ? erreur.message : String(erreur)}`)
  process.exitCode = 1
})
