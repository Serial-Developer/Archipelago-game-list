/**
 * Source de repli : export xlsx public du classeur.
 *
 * Utilisée uniquement si `GOOGLE_SHEETS_API_KEY` est absente. Deux limites
 * connues, toutes deux inhérentes à cette voie :
 *
 * 1. Le format xlsx ne stocke qu'un hyperlien par cellule. Une cellule
 *    « APWorld, Poptracker » ne rend donc que le premier lien, et son libellé
 *    est le texte entier de la cellule.
 * 2. exceljs repère les commentaires des exports Google mais n'en extrait pas
 *    le texte (`{ texts: [] }`) : les info-bulles d'en-tête sont perdues, donc
 *    `meta.columnHelp` reste vide.
 *
 * Les données textuelles, elles, sont complètes et exactes.
 */
import ExcelJS from 'exceljs'
import type { RawCell, RawSheet } from './raw.ts'

export function urlExportXlsx(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=xlsx`
}

/** exceljs expose la note soit en chaîne, soit en objet à fragments. */
function noteDeCellule(note: unknown): string | null {
  if (typeof note === 'string') return note.trim() || null
  if (note && typeof note === 'object' && 'texts' in note) {
    const fragments = (note as { texts?: { text?: string }[] }).texts ?? []
    const texte = fragments.map((f) => f.text ?? '').join('')
    return texte.trim() || null
  }
  return null
}

/**
 * Une valeur de cellule exceljs peut être une chaîne, un nombre, une date, du
 * texte enrichi, une formule ou un hyperlien : tout est ramené à du texte.
 */
function texteDeValeur(valeur: unknown): string {
  if (valeur === null || valeur === undefined) return ''
  if (typeof valeur === 'string') return valeur
  if (typeof valeur === 'number' || typeof valeur === 'boolean') return String(valeur)
  if (valeur instanceof Date) return valeur.toISOString()
  if (typeof valeur !== 'object') return ''

  const objet = valeur as Record<string, unknown>
  if (Array.isArray(objet.richText)) {
    return (objet.richText as { text?: string }[]).map((f) => f.text ?? '').join('')
  }
  if ('result' in objet) return texteDeValeur(objet.result)
  if ('text' in objet) return texteDeValeur(objet.text)
  return ''
}

function urlDeCellule(cellule: ExcelJS.Cell): string {
  if (typeof cellule.hyperlink === 'string') return cellule.hyperlink.trim()
  const valeur = cellule.value as Record<string, unknown> | null
  if (valeur && typeof valeur === 'object' && typeof valeur.hyperlink === 'string') {
    return valeur.hyperlink.trim()
  }
  return ''
}

function versCellule(cellule: ExcelJS.Cell): RawCell {
  const texte = texteDeValeur(cellule.value)
  const lien = urlDeCellule(cellule)
  return {
    text: texte,
    links: lien ? [{ label: texte.trim(), url: lien }] : [],
    note: noteDeCellule(cellule.note),
  }
}

function versFeuille(feuille: ExcelJS.Worksheet): RawSheet {
  const rows: RawCell[][] = []
  const nbColonnes = feuille.columnCount
  for (let ligne = 1; ligne <= feuille.rowCount; ligne++) {
    const source = feuille.getRow(ligne)
    const cellules: RawCell[] = []
    for (let colonne = 1; colonne <= nbColonnes; colonne++) {
      cellules.push(versCellule(source.getCell(colonne)))
    }
    rows.push(cellules)
  }
  return { title: feuille.name, rows }
}

export async function fetchViaXlsx(spreadsheetId: string, titres: string[]): Promise<RawSheet[]> {
  const reponse = await fetch(urlExportXlsx(spreadsheetId))
  if (!reponse.ok) {
    throw new Error(`Export xlsx : HTTP ${reponse.status} ${reponse.statusText}`)
  }

  const classeur = new ExcelJS.Workbook()
  await classeur.xlsx.load(await reponse.arrayBuffer())

  return titres.map((titre) => {
    const feuille = classeur.getWorksheet(titre)
    if (!feuille) {
      const disponibles = classeur.worksheets.map((f) => f.name).join(', ')
      throw new Error(`Export xlsx : onglet « ${titre} » introuvable. Onglets : ${disponibles}.`)
    }
    return versFeuille(feuille)
  })
}
