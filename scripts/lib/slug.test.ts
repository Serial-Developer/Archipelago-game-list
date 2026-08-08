import { describe, expect, it } from 'vitest'
import { assignIds, slugify } from './slug.ts'

describe('slugify', () => {
  it('met en minuscules et remplace les séparateurs par des tirets', () => {
    expect(slugify('A Difficult Game About Climbing')).toBe('a-difficult-game-about-climbing')
    expect(slugify('ANIMAL WELL')).toBe('animal-well')
  })

  it('retire les diacritiques', () => {
    expect(slugify('Pokémon Snap')).toBe('pokemon-snap')
    expect(slugify('PokéPark Wii: Pikachu’s Adventure')).toBe('pokepark-wii-pikachu-s-adventure')
  })

  it('ne laisse ni tiret en bordure ni tirets consécutifs', () => {
    expect(slugify('Elden Ring — Greenfield')).toBe('elden-ring-greenfield')
    expect(slugify("Baldur's Gate 3")).toBe('baldur-s-gate-3')
    expect(slugify('  Anno 1800  ')).toBe('anno-1800')
  })

  it('conserve les chiffres, qui distinguent souvent les épisodes', () => {
    expect(slugify('Castlevania 64')).toBe('castlevania-64')
    expect(slugify('Dark Cloud 2')).toBe('dark-cloud-2')
  })
})

describe('assignIds', () => {
  it('laisse les identifiants nus quand il n’y a pas de collision', () => {
    const { ids, warnings } = assignIds(['ActRaiser', 'Anno 1800'])
    expect(ids).toEqual(['actraiser', 'anno-1800'])
    expect(warnings).toEqual([])
  })

  it('suffixe et signale les collisions de manière déterministe', () => {
    const { ids, warnings } = assignIds(['Animal Well', 'ANIMAL WELL', 'animal-well'])
    expect(ids).toEqual(['animal-well', 'animal-well-2', 'animal-well-3'])
    expect(warnings).toHaveLength(2)
    expect(warnings[0]).toContain('ANIMAL WELL')
  })

  it('échoue franchement sur un nom qui ne produit aucun identifiant', () => {
    expect(() => assignIds(['???'])).toThrow(/aucun identifiant/)
  })
})
