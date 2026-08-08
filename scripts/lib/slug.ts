/**
 * Fabrication des identifiants de jeu.
 *
 * L'id sert d'URL (`/#/game/:id`) et de clé dans first-seen.json : il doit
 * rester stable dans le temps, donc dérivé uniquement du nom.
 */

/** Marques diacritiques combinantes, isolées par la normalisation NFD. */
const DIACRITIQUES = /[̀-ͯ]/g

/**
 * `Pokémon Snap` → `pokemon-snap`, `Elden Ring — Greenfield` → `elden-ring-greenfield`.
 * Les diacritiques sont décomposés puis retirés, tout le reste devient un tiret.
 */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(DIACRITIQUES, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

/**
 * Attribue un id unique à chaque nom, dans l'ordre reçu.
 *
 * Deux noms distincts peuvent produire le même slug (`ANIMAL WELL` et
 * `Animal Well`). Le premier rencontré garde le slug nu, les suivants reçoivent
 * un suffixe numérique déterministe. Aucune collision n'existe dans le sheet
 * actuel : le suffixe est un filet de sécurité, et il est signalé.
 */
export function assignIds(names: string[]): { ids: string[]; warnings: string[] } {
  const used = new Map<string, number>()
  const warnings: string[] = []
  const ids: string[] = []

  for (const name of names) {
    const base = slugify(name)
    if (!base) {
      throw new Error(
        `Nom de jeu ne produisant aucun identifiant exploitable : ${JSON.stringify(name)}`,
      )
    }
    const seen = used.get(base) ?? 0
    used.set(base, seen + 1)
    if (seen === 0) {
      ids.push(base)
    } else {
      const id = `${base}-${seen + 1}`
      warnings.push(`Collision d'identifiant sur « ${name} » : utilisation de « ${id} ».`)
      ids.push(id)
    }
  }

  return { ids, warnings }
}
