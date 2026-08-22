# Agent Handover — SinkHole

## État Actuel du Projet

- **Nom du projet :** `SinkHole`
- **Dépôt GitHub :** [https://github.com/DevOpsBenjamin/sinkhole](https://github.com/DevOpsBenjamin/sinkhole)
- **Localisation :** `/Users/devops.benjamin/Work/SinkHole`
- **Stack technique arrêtée :** 
  - Babylon.js 7+ (WebGPU / WebGL2)
  - Havok Physics (Wasm - `@babylonjs/havok`)
  - TypeScript + Vite
  - Stencil Buffer Cutout Masking

## Structure des règles et gouvernance

Les règles et conventions d'agents issues de `JanusRP` ont été intégrées :
- `AGENTS.md` : Workflow de branche par ticket, PR `gh pr create` et `gh pr merge --squash --delete-branch`.
- `docs/agents/issue-tracker.md` : Protocole Wayfinder et GitHub Issues.
- `docs/agents/domain.md` : Layout de domaine mono-contexte (`CONTEXT.md` + `docs/adr/`).
- `CONTEXT.md` : Glossaire du langage omniprésent (*Le Trou*, *L'Abîme*, *Masque Stencil*, *Entité Avaleuse*, *Niveau de Taille / Tiers*, *Déclencheur d'Ingestion*, etc.).

## Prochaine étape : Wayfinder Charting

Lancer ou poursuivre la commande `/wayfinder` pour cartographier le projet :
1. **Confirmer la Destination** : MVP Web 3D jouable (Babylon.js + Havok + Stencil Mask + Contrôles hybrides Souris/Touch/Clavier + 3 Tiers d'objets procéduraux + Mode Chrono 2 min).
2. **Créer l'issue Map** : `wayfinder:map` sur GitHub via `gh issue create`.
3. **Créer et ordonnancer les tickets enfants** :
   - Setup Vite + TypeScript + Babylon.js + Havok Wasm.
   - Système de rendu Stencil Buffer (trou et sol).
   - Contrôleur de déplacement du trou (Follow pointer / WASD).
   - Arène & Génération procédurale d'objets avec rigidbodies Havok (Tiers 1, 2, 3).
   - Triggers d'ingestion & filtrage de collision (désactivation du sol + attraction vers l'abîme).
   - Jauge de score, boucle d'ingestion & grossissement du trou.
   - Interface Babylon GUI (Chronomètre 2 min, score, barre de progression).
