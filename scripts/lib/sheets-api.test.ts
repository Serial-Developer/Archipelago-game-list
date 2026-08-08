import { describe, expect, it } from 'vitest'
import { liensDepuisRuns } from './sheets-api.ts'

const lien = (uri: string) => ({ format: { link: { uri } } })

describe('liensDepuisRuns', () => {
  it('ne rend rien quand la cellule n’a aucun run', () => {
    expect(liensDepuisRuns('Github Releases', undefined)).toEqual([])
    expect(liensDepuisRuns('Github Releases', [])).toEqual([])
  })

  it('découpe une cellule à plusieurs liens en un lien par segment', () => {
    // Cas réel : « Github Releases, Game Info » porte deux hyperliens distincts.
    const texte = 'Github Releases, Game Info'
    const runs = [
      { startIndex: 0, ...lien('https://example.test/releases') },
      { startIndex: 15, format: {} },
      { startIndex: 17, ...lien('https://example.test/info') },
    ]
    expect(liensDepuisRuns(texte, runs)).toEqual([
      { label: 'Github Releases', url: 'https://example.test/releases' },
      { label: 'Game Info', url: 'https://example.test/info' },
    ])
  })

  it('rogne la ponctuation de séparation autour des libellés', () => {
    const texte = 'APWorld, Poptracker'
    const runs = [
      { startIndex: 0, ...lien('https://example.test/apworld') },
      { startIndex: 7, ...lien('https://example.test/poptracker') },
    ]
    expect(liensDepuisRuns(texte, runs).map((l) => l.label)).toEqual(['APWorld', 'Poptracker'])
  })

  it('refusionne les runs consécutifs qui pointent vers la même URL', () => {
    // Un changement de mise en forme au milieu d'un libellé scinde le run.
    const texte = 'Github Releases'
    const runs = [
      { startIndex: 0, ...lien('https://example.test/r') },
      { startIndex: 6, ...lien('https://example.test/r') },
    ]
    expect(liensDepuisRuns(texte, runs)).toEqual([
      { label: 'Github Releases', url: 'https://example.test/r' },
    ])
  })

  it('ignore les segments sans lien', () => {
    expect(liensDepuisRuns('Aucun lien ici', [{ startIndex: 0, format: {} }])).toEqual([])
  })
})
