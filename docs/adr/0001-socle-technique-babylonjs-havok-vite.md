# 1. Choix du socle technique : Vite, TypeScript, Babylon.js 7+ et Havok Physics WASM

Date : 2026-08-22

## Statut

Accepté

## Contexte

Le projet **SinkHole** est un jeu Web 3D d'ingestion où le joueur contrôle un trou mobile qui avale des entités urbaines (bancs, voitures, bâtiments) dans une arène. Ce projet exige :
1. Un rendu 3D fluide à 60 FPS dans le navigateur.
2. La manipulation du Stencil Buffer pour masquer visuellement le sol à l'emplacement du trou sans modifier le maillage 3D statique de l'arène.
3. Une simulation physique réaliste et performante capable de gérer simultanément des dizaines de corps rigides dynamiques subissant la gravité et des forces d'attraction.
4. Une boucle de développement rapide avec un typage fort.

## Décision

Nous adoptons la pile technologique suivante :
- **Vite** comme bundler et serveur de développement pour sa rapidité (HMR instantané, gestion native des modules ES et des assets WASM).
- **TypeScript** en mode strict pour garantir la robustesse des contrats de données, de la gestion d'état et des mathématiques vectorielles.
- **Babylon.js 7+** (`@babylonjs/core`, `@babylonjs/gui`, `@babylonjs/loaders`) comme moteur 3D principal pour sa richesse fonctionnelle, son pipeline de rendu flexible, son support complet du Stencil Buffer et son système d'ombres.
- **Havok Physics WASM** (`@babylonjs/havok`) via le plugin Physics V2 (`HavokPlugin`) de Babylon.js pour le calcul physique des corps rigides, la détection des collisions et la simulation de gravité/suction.

## Conséquences

### Positives
- **Performance physique maximale** : Le moteur Havok WASM offre des performances de collision et de dynamique très supérieures aux moteurs JS traditionnels (Cannon/Ammo).
- **Architecture Physics V2 moderne** : Séparation claire entre `PhysicsBody`, `PhysicsShape` et instances de maillages.
- **Support natif du Stencil Buffer** : Facilité d'intégration du masque de trou sans shaders custom complexes.
- **Outillage moderne** : Démarrage quasi-instantané du serveur dev et build optimisé.

### Négatives / Contraintes
- Le binaire WASM de Havok (~2 Mo) doit être initialisé de façon asynchrone (`HavokPhysics()`) avant la création de tout corps rigide physique.
