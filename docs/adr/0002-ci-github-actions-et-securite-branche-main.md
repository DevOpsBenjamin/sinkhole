# 2. Intégration Continue (CI) et Sécurisation de la branche main

Date : 2026-08-22

## Statut

Accepté

## Contexte

Pour maintenir un standard élevé de qualité logicielle sur le projet **SinkHole**, chaque contribution (code, documentation, configuration) doit être validée automatiquement et protégée contre les erreurs humaines ou les régressions silencieuses.

Le projet a besoin de :
1. Valider automatiquement que le code TypeScript compile sans erreur et que le bundle Vite (incluant les modules Babylon.js et le binaire WASM Havok) se construit avec succès.
2. Protéger la branche `main` contre les commits directs, les `force-push` destructeurs et les suppressions accidentelles.
3. Exiger la validation du statut CI sur toute Pull Request avant la fusion.

## Décision

1. **Workflow GitHub Actions (`.github/workflows/ci.yml`)** :
   - Déclenché à chaque `push` et `pull_request` ciblant `main`.
   - Environnement `ubuntu-latest` avec Node.js 22 LTS et mise en cache des dépendances `npm`.
   - Exécution des commandes `npm ci` et `npm run build` (`tsc && vite build`).

2. **Protection de la branche `main` et configuration du dépôt via la CLI GitHub (`gh`)** :
   - Activation des vérifications de statut requises (`Build and Validate`).
   - Obligation stricte de passer par une Pull Request (`required_pull_request_reviews` avec interdiction de push direct sur `main`).
   - Forçage du mode **Squash & Merge exclusif** au niveau du dépôt (`allow_squash_merge: true`, `allow_merge_commit: false`, `allow_rebase_merge: false`).
   - Suppression automatique des branches après merge (`delete_branch_on_merge: true`) et activation de l'auto-merge (`allow_auto_merge: true`).
   - Désactivation des `force-push` et des suppressions de branche sur `main`.

## Conséquences

### Positives
- Détection immédiate des erreurs de typage TypeScript et de packaging des assets WebAssembly.
- Protection stricte de l'intégrité de l'arbre Git de production (`main`) avec interdiction totale des pushes directs.
- Historique de commit linéaire, lisible et propre sur `main` grâce au squash obligatoire.
- Respect garanti du workflow Pair-Programming / Agent ("Une branche par tâche / PR obligatoire").
