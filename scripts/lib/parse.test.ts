import { describe, expect, it } from 'vitest'
import type { Game } from '../../src/types.ts'
import { cellule, communitySheet, coreSheet } from './__fixtures__/sheets.ts'
import { findHeaderRow, parseCommunitySheet, parseCoreSheet, parseWorkbook } from './parse.ts'
import type { RawSheet } from './raw.ts'

const jeu = (resultat: { games: Game[] }, id: string): Game => {
  const trouve = resultat.games.find((g) => g.id === id)
  if (!trouve) throw new Error(`Jeu « ${id} » absent du résultat`)
  return trouve
}

describe('findHeaderRow', () => {
  it('trouve l’en-tête sous les lignes d’instructions', () => {
    const match = findHeaderRow(communitySheet(), { name: 'Game', stability: 'Stability' }, ['name'])
    expect(match.rowIndex).toBe(4)
    expect(match.columns).toEqual({ name: 0, stability: 1 })
  })

  it('ne suppose pas l’ordre des colonnes', () => {
    const sheet: RawSheet = {
      title: 'Test',
      rows: [[cellule('Stability'), cellule('Notes'), cellule('Game')]],
    }
    const match = findHeaderRow(sheet, { name: 'Game', stability: 'Stability' }, ['name'])
    expect(match.columns).toEqual({ name: 2, stability: 0 })
  })

  it('échoue explicitement quand une colonne requise manque', () => {
    const sheet: RawSheet = { title: 'Playable Worlds', rows: [[cellule('Stability')]] }
    expect(() => findHeaderRow(sheet, { name: 'Game' }, ['name'])).toThrow(
      /aucune ligne d'en-tête trouvée/,
    )
  })
})

describe('parseCommunitySheet', () => {
  const resultat = parseCommunitySheet(communitySheet())

  it('ne retient que les lignes portant un nom de jeu', () => {
    expect(resultat.games.map((g) => g.name)).toEqual([
      'ActRaiser',
      'A Difficult Game About Climbing',
      "Baldur's Gate 3",
      'Christmas Delivery',
    ])
  })

  it('normalise la stabilité', () => {
    expect(jeu(resultat, 'actraiser').stability).toBe('stable')
    expect(jeu(resultat, 'christmas-delivery').stability).toBe('broken')
  })

  it('conserve le PR Status verbatim, y compris le marqueur « -- »', () => {
    expect(jeu(resultat, 'actraiser').prStatus).toBe('--')
    expect(jeu(resultat, 'baldur-s-gate-3').prStatus).toBe('Not PRing')
  })

  it('lit le drapeau 18+', () => {
    expect(jeu(resultat, 'actraiser').adult).toBe(false)
    expect(jeu(resultat, 'baldur-s-gate-3').adult).toBe(true)
  })

  it('normalise la divulgation IA', () => {
    expect(jeu(resultat, 'actraiser').aiDisclosure).toBe('unknown')
    expect(jeu(resultat, 'baldur-s-gate-3').aiDisclosure).toBe('minor')
  })

  it('laisse les notes telles quelles, sauts de ligne compris, ou null si vides', () => {
    expect(jeu(resultat, 'actraiser').notes).toBeNull()
    expect(jeu(resultat, 'christmas-delivery').notes).toBe(
      'Setup instructions: Download the ChristmasDelivery.html and run it.\nDoes not work in 0.6.2 or higher.',
    )
  })

  it('range chaque lien dans le groupe de sa colonne d’origine', () => {
    expect(jeu(resultat, 'actraiser').links).toEqual([
      {
        label: 'APWorld',
        url: 'https://github.com/Happyhappyism/Archipelago/releases?q=%22ActRaiser%22&expanded=true',
        group: 'downloads',
      },
      { label: 'Website', url: 'https://rentry.co/actraiserv0-1', group: 'setup' },
      {
        label: 'Thread',
        url: 'https://discord.com/channels/731205301247803413/1113529234800005181',
        group: 'support',
      },
    ])
  })

  it('rend les deux liens d’une cellule qui en porte plusieurs', () => {
    const liens = jeu(resultat, 'a-difficult-game-about-climbing').links.filter(
      (l) => l.group === 'downloads',
    )
    expect(liens.map((l) => l.label)).toEqual(['Github Releases', 'Game Info'])
  })

  it('rattache le lien de la colonne Disclosures au groupe disclosure', () => {
    const divulgation = jeu(resultat, 'baldur-s-gate-3').links.filter(
      (l) => l.group === 'disclosure',
    )
    expect(divulgation).toHaveLength(1)
    expect(divulgation[0]!.label).toBe('Minor')
  })

  it('récupère les définitions officielles des colonnes', () => {
    expect(resultat.columnHelp.stability).toContain('Broken in Main')
    expect(resultat.columnHelp.adult).toContain('After Dark')
    expect(resultat.columnHelp.disclosure).toContain('generative AI')
  })

  it('ne produit aucun avertissement sur des données conformes', () => {
    expect(resultat.warnings).toEqual([])
  })
})

describe('parseCommunitySheet, données inattendues', () => {
  const avec = (stabilite: string, adulte: string, divulgation: string) => {
    const sheet = communitySheet()
    sheet.rows.push([
      cellule('Jeu Douteux'),
      cellule(stabilite),
      cellule('--'),
      cellule(adulte),
      cellule(''),
      cellule(''),
      cellule(''),
      cellule(divulgation),
      cellule(''),
    ])
    return parseCommunitySheet(sheet)
  }

  it('classe une stabilité inconnue en « unknown » et le signale', () => {
    const resultat = avec('Mostly Fine', '0', 'None')
    expect(jeu(resultat, 'jeu-douteux').stability).toBe('unknown')
    expect(resultat.warnings.join()).toContain('Stabilité inconnue')
  })

  it('accepte les graphies booléennes du drapeau 18+ selon la source', () => {
    // xlsx rend la case à cocher en booléen, l'API en TRUE/FALSE, le XML en 0/1.
    for (const coche of ['1', 'true', 'TRUE']) {
      expect(jeu(avec('Stable', coche, 'None'), 'jeu-douteux').adult).toBe(true)
    }
    for (const decoche of ['0', 'false', 'FALSE', '']) {
      const resultat = avec('Stable', decoche, 'None')
      expect(jeu(resultat, 'jeu-douteux').adult).toBe(false)
      expect(resultat.warnings).toEqual([])
    }
  })

  it('traite un drapeau 18+ illisible comme 18+, par précaution', () => {
    const resultat = avec('Stable', 'oui', 'None')
    expect(jeu(resultat, 'jeu-douteux').adult).toBe(true)
    expect(resultat.warnings.join()).toContain('18+')
  })

  it('laisse la divulgation IA vide plutôt que d’inventer une valeur', () => {
    const resultat = avec('Stable', '0', 'Peut-être')
    expect(jeu(resultat, 'jeu-douteux').aiDisclosure).toBeNull()
    expect(resultat.warnings.join()).toContain('Divulgation IA inconnue')
  })

  it('laisse la stabilité à « unknown » sans avertir si la cellule est vide', () => {
    const resultat = avec('', '0', '')
    expect(jeu(resultat, 'jeu-douteux').stability).toBe('unknown')
    expect(jeu(resultat, 'jeu-douteux').aiDisclosure).toBeNull()
    expect(resultat.warnings).toEqual([])
  })
})

describe('parseCoreSheet', () => {
  const resultat = parseCoreSheet(coreSheet())

  it('trouve l’en-tête en deuxième ligne et lit les deux jeux', () => {
    expect(resultat.games.map((g) => g.name)).toEqual(['Adventure', 'APQuest'])
  })

  it('marque ces jeux comme livrés avec Archipelago', () => {
    expect(resultat.games.every((g) => g.stability === 'core')).toBe(true)
    expect(resultat.games.every((g) => g.source === 'core')).toBe(true)
  })

  it('laisse vides les champs dont l’onglet n’a pas la colonne', () => {
    const adventure = jeu(resultat, 'adventure')
    expect(adventure.adult).toBe(false)
    expect(adventure.aiDisclosure).toBeNull()
    expect(adventure.prStatus).toBeNull()
    expect(adventure.notes).toBeNull()
  })

  it('classe la page officielle, le guide et le canal Discord dans leurs groupes', () => {
    expect(jeu(resultat, 'adventure').links).toEqual([
      { label: 'Game Page', url: 'https://archipelago.gg/games/Adventure/info/en', group: 'page' },
      { label: 'Setup Guide', url: 'https://archipelago.gg/tutorial/', group: 'setup' },
      {
        label: 'Discord Channel',
        url: 'https://discord.com/channels/731205301247803413/1090814076378153111',
        group: 'support',
      },
    ])
  })
})

describe('parseWorkbook', () => {
  it('assemble les deux onglets, community d’abord', () => {
    const resultat = parseWorkbook([communitySheet(), coreSheet()])
    expect(resultat.games).toHaveLength(6)
    expect(resultat.games.map((g) => g.source)).toEqual([
      'community',
      'community',
      'community',
      'community',
      'core',
      'core',
    ])
  })

  it('garantit des identifiants uniques sur l’ensemble', () => {
    const resultat = parseWorkbook([communitySheet(), coreSheet()])
    expect(new Set(resultat.games.map((g) => g.id)).size).toBe(resultat.games.length)
  })

  it('fusionne les info-bulles des deux onglets', () => {
    const resultat = parseWorkbook([communitySheet(), coreSheet()])
    expect(Object.keys(resultat.columnHelp).sort()).toEqual([
      'adult',
      'disclosure',
      'downloads',
      'name',
      'notes',
      'prStatus',
      'setup',
      'stability',
      'support',
    ])
  })

  it('échoue en nommant l’onglet manquant', () => {
    expect(() => parseWorkbook([communitySheet()])).toThrow(/Core-Verified Worlds/)
  })
})
