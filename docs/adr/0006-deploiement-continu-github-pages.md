# 6. Déploiement continu automatisé sur GitHub Pages

Date : 2026-08-22

## Statut

Accepté

## Contexte

**SinkHole** est une application Web 3D purement *Front-End* combinant Babylon.js 7+, TypeScript et le binaire WebAssembly de Havok Physics.

Pour permettre aux utilisateurs, testeurs et parties prenantes de tester le jeu instantanément depuis n'importe quel navigateur (desktop, tablette, mobile) sans installation locale, nous avons besoin d'un pipeline de livraison continue (CD) automatisé hébergeant les bundles de production.

## Décision

1. **Hébergement sur GitHub Pages (`https://devopsbenjamin.github.io/sinkhole/`)** :
   - Mode `build_type: workflow` configuré via l'API REST GitHub.
   - Accès public sécurisé en HTTPS avec certificats gérés automatiquement.

2. **Configuration Vite avec base relative (`vite.config.ts`)** :
   - Définition de `base: './'` pour assurer la résolution correcte de tous les chunks JavaScript, feuilles de style, et assets WebAssembly (`HavokPhysics.wasm`) quel que soit le chemin d'accès (racine de domaine ou sous-répertoire `/sinkhole/`).

3. **Workflow GitHub Actions (`.github/workflows/deploy.yml`)** :
   - Déclenché automatiquement à chaque `push` (ou merge de PR) sur la branche `main` ainsi que manuellement via `workflow_dispatch`.
   - Exécute `npm ci` et `npm run build` (`tsc && vite build`).
   - Utilise les actions officielles GitHub Pages : `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3` ciblant le répertoire `dist`, et `actions/deploy-pages@v4`.
   - Gère les autorisations de sécurité requises (`pages: write`, `id-token: write`).

## Conséquences

### Positives
- **Déploiement zéro friction** : Chaque pull request fusionnée sur `main` met à jour automatiquement la version jouable en ligne en moins d'une minute.
- **Support complet WebAssembly** : Les types MIME et headers nécessaires à l'exécution de Havok WASM sont gérés nativement.
- **Accès universel** : Permet le test direct sur appareils mobiles et tablettes pour valider le contrôle tactile.

### Négatives / Contraintes
- Le répertoire de publication `dist` doit contenir l'ensemble des assets statiques compilés et aucun composant serveur (ce qui est 100% conforme à l'architecture SinkHole).
