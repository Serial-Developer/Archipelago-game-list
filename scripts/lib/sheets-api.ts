/**
 * Source principale : Google Sheets API v4.
 *
 * C'est la seule voie qui rend TOUS les liens d'une cellule : une cellule
 * « APWorld, Poptracker » porte deux hyperliens, exposés via `textFormatRuns`.
 * L'export CSV les perd tous, l'export xlsx n'en garde qu'un (voir xlsx.ts).
 */
import type { RawCell, RawLink, RawSheet } from './raw.ts'

const RACINE_API = 'https://sheets.googleapis.com/v4/spreadsheets'

/** On ne demande que ce qui est utilisé : réponse plus légère, quota préservé. */
const CHAMPS =
  'sheets(properties.title,data.rowData.values(formattedValue,textFormatRuns,hyperlink,note))'

interface ApiTextFormatRun {
  startIndex?: number
  format?: { link?: { uri?: string } }
}

interface ApiCellData {
  formattedValue?: string
  textFormatRuns?: ApiTextFormatRun[]
  hyperlink?: string
  note?: string
}

interface ApiSheet {
  properties?: { title?: string }
  data?: { rowData?: { values?: ApiCellData[] }[] }[]
}

interface ApiResponse {
  sheets?: ApiSheet[]
}

/**
 * Découpe le texte d'une cellule selon ses `textFormatRuns` et récupère un lien
 * par segment porteur d'une URL.
 *
 * Un même lien peut être découpé en plusieurs runs si la mise en forme change
 * en cours de route (gras au milieu d'un libellé) : les runs consécutifs
 * pointant vers la même URL sont donc refusionnés.
 */
export function liensDepuisRuns(texte: string, runs: ApiTextFormatRun[] | undefined): RawLink[] {
  if (!runs?.length) return []

  const liens: RawLink[] = []
  for (let i = 0; i < runs.length; i++) {
    const uri = runs[i]!.format?.link?.uri
    if (!uri) continue

    const debut = runs[i]!.startIndex ?? 0
    let fin = runs[i + 1]?.startIndex ?? texte.length
    // Absorbe les runs suivants qui portent la même URL.
    while (i + 1 < runs.length && runs[i + 1]!.format?.link?.uri === uri) {
      i++
      fin = runs[i + 1]?.startIndex ?? texte.length
    }

    const label = texte.slice(debut, fin).replace(/^[\s,;/|]+|[\s,;/|]+$/g, '')
    liens.push({ label, url: uri })
  }
  return liens
}

function versCellule(cellule: ApiCellData | undefined): RawCell {
  const texte = cellule?.formattedValue ?? ''
  let liens = liensDepuisRuns(texte, cellule?.textFormatRuns)
  // Cellule dont le lien couvre toute la valeur : pas de run, juste `hyperlink`.
  if (liens.length === 0 && cellule?.hyperlink) {
    liens = [{ label: texte.trim(), url: cellule.hyperlink }]
  }
  return { text: texte, links: liens, note: cellule?.note ?? null }
}

function versFeuille(feuille: ApiSheet): RawSheet {
  const lignes = feuille.data?.[0]?.rowData ?? []
  return {
    title: feuille.properties?.title ?? '',
    rows: lignes.map((ligne) => (ligne.values ?? []).map(versCellule)),
  }
}

/**
 * Récupère les onglets demandés. Chaque titre est passé en `ranges`, ce qui
 * évite de rapatrier les onglets inutiles du classeur.
 */
export async function fetchViaSheetsApi(
  spreadsheetId: string,
  apiKey: string,
  titres: string[],
): Promise<RawSheet[]> {
  const url = new URL(`${RACINE_API}/${encodeURIComponent(spreadsheetId)}`)
  url.searchParams.set('key', apiKey)
  url.searchParams.set('includeGridData', 'true')
  url.searchParams.set('fields', CHAMPS)
  for (const titre of titres) url.searchParams.append('ranges', titre)

  const reponse = await fetch(url)
  if (!reponse.ok) {
    const corps = await reponse.text()
    // La clé peut apparaître dans le message d'erreur renvoyé par Google.
    const nettoye = corps.replaceAll(apiKey, '[clé masquée]').slice(0, 500)
    throw new Error(`API Sheets : HTTP ${reponse.status} ${reponse.statusText} — ${nettoye}`)
  }

  const donnees = (await reponse.json()) as ApiResponse
  const feuilles = (donnees.sheets ?? []).map(versFeuille)
  if (feuilles.length === 0) {
    throw new Error("API Sheets : réponse sans aucun onglet, impossible d'en tirer des données.")
  }
  return feuilles
}
