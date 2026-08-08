/**
 * Fixtures calquées sur la structure réelle du sheet (relevée le 08/08/2026) :
 * quatre lignes d'instructions, en-tête en ligne 5 pour « Playable Worlds » et
 * en ligne 2 pour « Core-Verified Worlds », lignes vides en fin d'onglet.
 *
 * Les jeux repris ici sont de vraies lignes du sheet, y compris leurs liens.
 */
import type { RawCell, RawLink, RawSheet } from '../raw.ts'

export function cellule(text: string, links: RawLink[] = [], note: string | null = null): RawCell {
  return { text, links, note }
}

export function lien(label: string, url: string): RawLink {
  return { label, url }
}

/** Cellule dont le texte porte un unique lien couvrant toute la valeur. */
export function cellLien(text: string, url: string): RawCell {
  return cellule(text, [lien(text, url)])
}

const VIDE = cellule('')

const NOTE_STABILITE =
  '- Stable: Should be completely playable without major issues/workarounds.\n' +
  '- Unstable: Playable, but there’s enough issues that the host should be prepared for problems.\n' +
  '- Broken in Main: Not playable in the current version of Archipelago.'

const NOTE_ADULTE =
  'Not allowed on the main discord due to 18+ or Unrated age rating. ' +
  "See the After Dark discord for the game's channel."

const NOTE_DIVULGATION =
  'By popular demand, the relationship a project has with LLM, generative AI, ' +
  'as has been publicly disclosed, is shared on this sheet.'

export function communitySheet(): RawSheet {
  return {
    title: 'Playable Worlds',
    rows: [
      [
        cellule('APWorlds should be placed in the custom_worlds folder.'),
        cellLien('The host can generate the game by following these instructions', 'https://archipelago.gg/tutorial/Archipelago/setup/en'),
      ],
      [cellule('Please only download APWorlds from trusted sources. '), cellule('You need to run custom code to generate a game.')],
      [cellule('Alternate places to get info on APWorlds:'), cellule(' APWorld Index discord channel, Archipelago Wiki')],
      [cellule('If something is missing, leave a comment!'), cellule('Hover over column headers for more details!')],
      [
        cellule('Game', [], 'Sorted alphabetically, with games in the same series put next to each other in series order.'),
        cellule('Stability', [], NOTE_STABILITE),
        cellule('PR Status', [], '- Merged: Will be in the next version of Archipelago.'),
        cellule('18+ / Unrated', [], NOTE_ADULTE),
        cellule('Links & Downloads', [], 'Sometimes, the APWorld is used as the Client.'),
        cellule('Setup Guides', [], 'Links to guides generally can be found in the github repo.'),
        cellule('Support', [], 'Links to where the implementation is discussed and where you can find support.'),
        cellule('Disclosures', [], NOTE_DIVULGATION),
        cellule('Notes', [], "Any notes that don't fit in the other columns"),
      ],
      [
        cellule('ActRaiser'),
        cellule('Stable'),
        cellule('--'),
        cellule('0'),
        cellLien('APWorld', 'https://github.com/Happyhappyism/Archipelago/releases?q=%22ActRaiser%22&expanded=true'),
        cellLien('Website', 'https://rentry.co/actraiserv0-1'),
        cellLien('Thread', 'https://discord.com/channels/731205301247803413/1113529234800005181'),
        cellule('Unknown'),
        VIDE,
      ],
      [
        // Cellule à deux liens : le cas que seul l'API v4 sait restituer.
        cellule('A Difficult Game About Climbing'),
        cellule('Stable'),
        cellule('--'),
        cellule('0'),
        cellule('Github Releases, Game Info', [
          lien('Github Releases', 'https://github.com/BlastSlimey/GrabbingChecks/releases/latest'),
          lien('Game Info', 'https://github.com/BlastSlimey/GrabbingChecks'),
        ]),
        cellLien('Github', 'https://github.com/BlastSlimey/Archipelago/blob/difficult_climbing/worlds/difficult_climbing/docs/setup_en.md'),
        cellLien('Thread', 'https://discord.com/channels/731205301247803413/1336857648464920586'),
        cellule('Unknown'),
        VIDE,
      ],
      [
        // Jeu 18+ : canal After Dark et divulgation IA porteuse d'un lien.
        cellule("Baldur's Gate 3"),
        cellule('Stable'),
        cellule('Not PRing'),
        cellule('1'),
        cellule('APWorld, Client, Poptracker', [lien('APWorld', 'https://github.com/zane31415/ArchipelagoBG3/releases')]),
        cellLien('Github', 'https://github.com/zane31415/ArchipelagoBG3/blob/main/worlds/bg3/docs/setup_en.md'),
        cellLien('Channel (AD)', 'https://discord.com/channels/1085716850370957462/1419417116842393821'),
        cellLien('Minor', 'https://discord.com/channels/1085716850370957462/1419417116842393821/1531468615243661422'),
        VIDE,
      ],
      [
        cellule('Christmas Delivery'),
        cellule('Broken on Main'),
        cellule('--'),
        cellule('0'),
        cellLien('APWorld (Forgejo)', 'https://git.moyskleytech.com/ObsidianMakerDevelopment/christmasdeliveryapworld/releases'),
        cellLien('Forgejo', 'https://git.moyskleytech.com/ObsidianMakerDevelopment/christmasdeliveryapworld'),
        cellLien('Thread', 'https://discord.com/channels/731205301247803413/1317840527760298045'),
        cellule('Unknown'),
        cellule('Setup instructions: Download the ChristmasDelivery.html and run it.\nDoes not work in 0.6.2 or higher.'),
      ],
      // Lignes vides de fin d'onglet : doivent être ignorées.
      [VIDE, VIDE, VIDE],
      [],
    ],
  }
}

export function coreSheet(): RawSheet {
  return {
    title: 'Core-Verified Worlds',
    rows: [
      [
        cellLien(
          'This is a duplication of the main game list, for convienience.',
          'https://archipelago.gg/games',
        ),
      ],
      [cellule('Game'), cellule('Game Page'), cellule('Setup Guide'), cellule('Discord Channel')],
      [
        cellule('Adventure'),
        cellLien('Game Page', 'https://archipelago.gg/games/Adventure/info/en'),
        cellLien('Setup Guide', 'https://archipelago.gg/tutorial/'),
        cellLien('Discord Channel', 'https://discord.com/channels/731205301247803413/1090814076378153111'),
      ],
      [
        cellule('APQuest'),
        cellLien('Game Page', 'https://archipelago.gg/games/APQuest/info/en'),
        cellLien('Setup Guide', 'https://archipelago.gg/tutorial/'),
        cellLien('Discord Channel', 'https://discord.com/channels/731205301247803413/1450659987331481610'),
      ],
      [VIDE, VIDE, VIDE, VIDE],
    ],
  }
}
