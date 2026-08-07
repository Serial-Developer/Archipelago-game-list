# Archipelago — liste des jeux

Interface web statique listant les jeux compatibles [Archipelago](https://archipelago.gg),
générée à partir d'une source unique : le Google Sheet communautaire
([Playable Worlds / Core-Verified Worlds](https://docs.google.com/spreadsheets/d/1iuzDTOAvdoNe8Ne8i461qGNucg5OuEoF-Ikqs8aUQZw)).

Site : https://serial-developer.github.io/Archipelago-game-list/

## État actuel

Jalon 1 livré : squelette du site + déploiement continu sur GitHub Pages.
La page d'accueil est un placeholder — **aucune donnée de jeu n'est encore affichée**,
le pipeline de récupération n'existe pas à ce stade.

Suite prévue :

2. Pipeline `scripts/fetch-data.ts` : Sheets API v4 → `public/data/games.json` + tests
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

| Commande            | Effet                                        |
| ------------------- | -------------------------------------------- |
| `npm run build`     | `vue-tsc --build` puis build Vite vers `dist/` |
| `npm run typecheck` | Vérification des types seule                 |
| `npm run preview`   | Sert le build de `dist/` en local            |

## Déploiement

Le workflow `.github/workflows/deploy.yml` construit et publie sur GitHub Pages
à chaque push sur `main`, ainsi qu'à la demande (`workflow_dispatch`).
Il faut que **Settings → Pages → Source** soit réglé sur **GitHub Actions**.

## Secrets

| Secret                  | Utilisé par                | État                                        |
| ----------------------- | -------------------------- | ------------------------------------------- |
| `GOOGLE_SHEETS_API_KEY` | pipeline de données (jalon 2) | Pas encore nécessaire — à créer avant le jalon 2 |

Aucun appel Google n'est fait depuis le navigateur : la clé reste côté GitHub
Actions, le client ne lit que le JSON statique produit par le pipeline.

## Principe de données

Source unique, aucune donnée inventée : si un champ est absent du Google Sheet,
il est absent de l'interface.
