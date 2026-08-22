# Domain Documentation

## Layout

**Layout: single-context**

This repo uses a single root-level domain context:

- `CONTEXT.md` at repo root — Ubiquitous language glossary
- `docs/adr/` — Architecture Decision Records

## Consumer rules

- Read `CONTEXT.md` before designing or implementing domain logic.
- Use exact terms defined in `CONTEXT.md`.
- Propose additions to `CONTEXT.md` when new domain concepts are introduced.
- **Branch & PR Workflow** : Tout ajout/modification de `CONTEXT.md` ou d'un ADR dans `docs/adr/` doit être réalisé sur la branche dédiée du ticket, soumis via Pull Request et mergé sur `main` (`gh pr merge --squash --delete-branch`) avant la clôture du ticket.
