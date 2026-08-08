/**
 * Garde-fous appliqués avant toute écriture.
 *
 * Le principe : un site figé sur le dernier bon snapshot vaut mieux qu'un site
 * rempli de vide. Toute anomalie de volume fait échouer le run sans rien écrire.
 */
import type { Game } from '../../src/types.ts'

/**
 * Un snapshot qui perd plus de 20 % des jeux signale un sheet cassé, une
 * structure modifiée ou une réponse tronquée — pas une évolution normale.
 */
export const SEUIL_REGRESSION = 0.8

/** Seuil en dessous duquel le nouveau snapshot est rejeté. */
export function seuilMinimal(precedent: number): number {
  return Math.ceil(precedent * SEUIL_REGRESSION)
}

/**
 * @param precedent Nombre de jeux du snapshot précédent, `null` au premier run.
 * @throws si le nouveau snapshot est vide ou en chute anormale.
 */
export function verifierVolume(games: Game[], precedent: number | null): void {
  if (games.length === 0) {
    throw new Error('Parsing terminé sans aucun jeu : rien ne sera écrit.')
  }
  if (precedent !== null && precedent > 0 && games.length < seuilMinimal(precedent)) {
    throw new Error(
      `Chute anormale du nombre de jeux : ${games.length} contre ${precedent} au snapshot ` +
        `précédent (seuil : ${seuilMinimal(precedent)}). Rien ne sera écrit.`,
    )
  }
}
