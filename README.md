# Archipelago — liste des jeux

Interface web statique listant les jeux compatibles [Archipelago](https://archipelago.gg),
générée à partir d'une source unique : le Google Sheet communautaire
([Playable Worlds / Core-Verified Worlds](https://docs.google.com/spreadsheets/d/1iuzDTOAvdoNe8Ne8i461qGNucg5OuEoF-Ikqs8aUQZw)).

Site : https://serial-developer.github.io/Archipelago-game-list/

## État actuel

Jalons 1 et 2 livrés : squelette du site déployé sur GitHub Pages, et pipeline de
données produisant `public/data/games.json` (743 jeux). La page d'accueil reste un
placeholder — **le front ne lit pas encore ce JSON**.

Suite prévue :

3. UI liste : cartes, badges de statut, recherche, filtres, tris
4. Page détail (`/#/game/:id`)
5. Enrichissement jaquettes Steam + `data/steam-mapping.json`
6. `data/first-seen.json` (date d'ajout au sheet) + tri par date
7. Workflow cron quotidien + diff + `CHANGELOG.md` automatique

## Stack

- Vue 3 + Vite + TypeScript strict
- Tailwind CSS 4 (plugin Vite, thème dark-only déclaré dans `src/style.css`)
- `vue-router` en **hash mode** : GitHub Pages sert du statique, aucune règle de
  rewrite n'est possible, donc les URL de détail sont de la forme `/#/game/:id`
- Base path Vite : `/Archipelago-game-list/` (voir `vite.config.ts`)

## Développement

```bash
npm install
npm run dev
```

Autres scripts :

| Commande             | Effet                                          |
| -------------------- | ---------------------------------------------- |
| `npm run build`      | `vue-tsc --build` puis build Vite vers `dist/`  |
| `npm run typecheck`  | Vérification des types seule                   |
| `npm test`           | Tests Vitest du pipeline (parsing, ids, liens)  |
| `npm run fetch-data` | Régénère `public/data/games.json` et `meta.json` |
| `npm run preview`    | Sert le build de `dist/` en local              |

## Déploiement

Le workflow `.github/workflows/deploy.yml` teste, construit et publie sur GitHub
Pages à chaque push sur `main`, ainsi qu'à la demande (`workflow_dispatch`).
Il faut que **Settings → Pages → Source** soit réglé sur **GitHub Actions**.

## Pipeline de données

`scripts/fetch-data.ts` lit le Google Sheet et écrit deux fichiers versionnés :

- `public/data/games.json` — le tableau des jeux, typé par `Game` dans `src/types.ts`
- `public/data/meta.json` — date du snapshot, mode de récupération, compteurs, et
  définitions officielles des colonnes (`columnHelp`)

### Deux sources, une seule structure

Les deux voies produisent la même structure neutre (`scripts/lib/raw.ts`), ce qui
permet de tester le parsing sans réseau.

| Voie                                | Quand                            | Fidélité |
| ----------------------------------- | -------------------------------- | -------- |
| **Sheets API v4** (`sheets-api.ts`) | `GOOGLE_SHEETS_API_KEY` définie  | Complète : tous les liens de chaque cellule, plus les info-bulles d'en-tête |
| **Export xlsx** (`xlsx.ts`)         | Repli, sans clé                  | Dégradée : **un seul lien par cellule**, et `columnHelp` reste vide |

La dégradation vient du format lui-même : une cellule « APWorld, Poptracker »
porte deux hyperliens que le xlsx ne sait pas stocker, et exceljs ne parvient pas
à extraire le texte des commentaires d'un export Google. `meta.fetchMode`
enregistre laquelle des deux voies a produit le snapshot.

### Colonnes lues

L'en-tête est localisée dynamiquement (elle se déplace au gré des éditions) et
les colonnes sont retrouvées par libellé, jamais par position.

- **Playable Worlds** (662 jeux) : `Game`, `Stability`, `PR Status`,
  `18+ / Unrated`, `Links & Downloads`, `Setup Guides`, `Support`,
  `Disclosures`, `Notes`
- **Core-Verified Worlds** (81 jeux) : `Game`, `Game Page`, `Setup Guide`,
  `Discord Channel`

L'onglet « Tools, Meta Games, & Hint Games » est hors périmètre en V1.

### Garde-fous

Le script échoue sans rien écrire — donc sans jamais publier un JSON appauvri — si :

- le sheet est inaccessible ou un onglet attendu a disparu ;
- la ligne d'en-tête est introuvable ou une colonne obligatoire manque ;
- le parsing ne rend aucun jeu ;
- le nombre de jeux tombe sous 80 % du snapshot précédent.

Les anomalies non bloquantes (stabilité inconnue, drapeau 18+ illisible) sont
signalées sur la sortie d'erreur et **ne sont jamais devinées** : le champ reste
vide, sauf pour le drapeau 18+ où le doute masque le jeu par précaution.

## Secrets

| Secret                  | Utilisé par         | État                                                    |
| ----------------------- | ------------------- | ------------------------------------------------------- |
| `GOOGLE_SHEETS_API_KEY` | `npm run fetch-data` | Optionnel : sans elle, le pipeline bascule sur le repli xlsx |

Aucun appel Google n'est fait depuis le navigateur : la clé reste côté GitHub
Actions, le client ne lit que le JSON statique produit par le pipeline. En local,
poser la clé dans un fichier `.env.local` (déjà ignoré par git) suffit.

## Principe de données

Source unique, aucune donnée inventée : si un champ est absent du Google Sheet,
il est absent de l'interface.
