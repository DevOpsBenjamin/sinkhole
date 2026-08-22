# Issue tracker & Pull Requests: GitHub

Issues, specs et Pull Requests pour ce repo vivent sur GitHub. Utiliser la CLI `gh` pour toutes les opérations.

## Conventions

- **Créer une branche par ticket** : `git checkout -b <type>/issue-<n>-<slug>` (ex: `feat/issue-2-physics-setup`, `docs/issue-3-stencil-masking`).
- **Créer une issue** : `gh issue create --title "..." --body "..."`.
- **Consulter une issue** : `gh issue view <number> --comments`.
- **Lister les issues** : `gh issue list --state open --json number,title,body,labels,comments`
- **Commenter une issue** : `gh issue comment <number> --body "..."`
- **Gérer les labels** : `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Créer une Pull Request** : `gh pr create --title "..." --body "Closes #<number>\n\n<summary>"`
- **Merger une PR** : `gh pr merge --squash --delete-branch` puis synchroniser avec `git checkout main && git pull origin main`.

Infer the repo from `git remote -v` — `gh` does this automatically when run inside a clone.

## Pull requests as a delivery and resolution surface

Toute livraison de code, de documentation ou de décision ADR passe par une Pull Request créée via `gh pr create` et fusionnée via `gh pr merge --squash --delete-branch`.

## When a skill says "publish to the issue tracker"

Créer une GitHub issue.

## When a skill says "fetch the relevant ticket"

Exécuter `gh issue view <number> --comments`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (ou liste dans le body). Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`).
- **Blocking**: GitHub's native issue dependencies (`gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`).
- **Frontier query**: list open children without open blockers or assignees.
- **Claim**: `gh issue edit <n> --add-assignee @me` — premier write, suivi immédiatement de la création de branche `git checkout -b <type>/issue-<n>-<slug>`.
- **Resolve**:
  1. **Commit & Push sur la branche** : `git add -A && git commit -m "<type>: <description>" && git push -u origin <branch>`.
  2. **Création & Merge de la Pull Request** :
     - `gh pr create --title "<type>: resolve issue #<n> - <title>" --body "Closes #<n>\n\n## Résolution\n\n<résumé>"`
     - `gh pr merge --squash --delete-branch`
     - `git checkout main && git pull origin main`
  3. **Commentaire de résolution & Clôture** : Poster le commentaire détaillé sur l'issue (`gh issue comment <n> --body "<answer>"`) et clore si non fait automatiquement (`gh issue close <n>`).
  4. **Mise à jour de la carte** : Ajouter le pointeur de contexte dans Decisions-so-far et cocher le ticket dans la map issue.
  5. **Vérification** : Confirmer que `git status` est propre sur la branche `main`.
