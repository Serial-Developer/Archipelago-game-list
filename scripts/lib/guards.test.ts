import { describe, expect, it } from 'vitest'
import type { Game } from '../../src/types.ts'
import { seuilMinimal, verifierVolume } from './guards.ts'

const jeux = (n: number): Game[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `jeu-${i}`,
    name: `Jeu ${i}`,
    stability: 'stable',
    prStatus: null,
    adult: false,
    aiDisclosure: null,
    notes: null,
    links: [],
    source: 'community',
  }))

describe('verifierVolume', () => {
  it('refuse un snapshot vide', () => {
    expect(() => verifierVolume([], 743)).toThrow(/aucun jeu/)
    expect(() => verifierVolume([], null)).toThrow(/aucun jeu/)
  })

  it('accepte n’importe quel volume au premier run', () => {
    expect(() => verifierVolume(jeux(1), null)).not.toThrow()
  })

  it('accepte une variation normale, à la hausse comme à la baisse', () => {
    expect(() => verifierVolume(jeux(760), 743)).not.toThrow()
    expect(() => verifierVolume(jeux(700), 743)).not.toThrow()
  })

  it('refuse une chute de plus de 20 %', () => {
    // 743 jeux → seuil à 595 ; 594 doit passer à la trappe.
    expect(seuilMinimal(743)).toBe(595)
    expect(() => verifierVolume(jeux(594), 743)).toThrow(/Chute anormale/)
    expect(() => verifierVolume(jeux(595), 743)).not.toThrow()
  })

  it('mentionne les deux comptes et le seuil dans l’erreur', () => {
    expect(() => verifierVolume(jeux(10), 743)).toThrow(/10 contre 743.*seuil : 595/)
  })
})
