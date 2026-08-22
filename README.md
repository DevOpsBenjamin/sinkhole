# 🕳️ Sinkhole

> An insatiable physics-driven 3D web game built with **Babylon.js 7+** and **Havok Physics (Wasm)**.

[![CI](https://github.com/DevOpsBenjamin/sinkhole/actions/workflows/ci.yml/badge.svg)](https://github.com/DevOpsBenjamin/sinkhole/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/DevOpsBenjamin/sinkhole/actions/workflows/deploy.yml/badge.svg)](https://github.com/DevOpsBenjamin/sinkhole/actions/workflows/deploy.yml)

🎮 **[Jouer en direct sur GitHub Pages](https://devopsbenjamin.github.io/sinkhole/)**

---

## 🎮 Concept

**Sinkhole** est un jeu d'arcade 3D Web temps réel inspiré du genre "Hole" (*Hole.io*, *Donut County*). 

Le joueur contrôle un trou insatiable qui se déplace sur le sol de l'arène urbaine, dévorant tout sur son passage. En avalant des entités du décor classées par Tiers (cônes, poubelles, bancs, voitures, arbres, camions, maisons), le trou grossit et devient capable d'avaler des structures de plus en plus massives en 2 minutes chrono !

---

## ⚡ Tech Stack

- **Moteur 3D :** [Babylon.js 7+](https://www.babylonjs.com/) (WebGL2 & WebGPU)
- **Moteur Physique :** [Havok Physics](https://doc.babylonjs.com/features/featuresDeepDive/physics/havokPlugin) (WebAssembly natif)
- **Langage & Bundler :** [TypeScript](https://www.typescriptlang.org/) strict + [Vite](https://vitejs.dev/)
- **Effets Visuels :** Masquage Stencil Buffer multi-passes pour perforation optique du sol sans altération géométrique
- **Interface Utilisateur :** Babylon GUI 2D (AdvancedDynamicTexture) responsive desktop & mobile
- **Déploiement Continu :** GitHub Actions & GitHub Pages (Front-End 100% statique avec streaming WASM)

---

## 🚀 Fonctionnalités & Points Forts Techniques

* **Masquage Stencil Buffer temps réel :** Découpe visuelle du sol sans altérer la géométrie ni générer de recalculs CSG coûteux.
* **Simulation Physique Havok WASM :** Simulation fluide à 60 FPS de dizaines de corps rigides dynamiques subissant gravité et attractions.
* **Contrôleur Hybride Multi-plateformes :** Pilotage fluide et unifié Souris (raycast / drag), Touch (mobile/tablette) et Clavier (WASD / ZQSD / Flèches).
* **Entités Avaleuses par Tiers :** Progression naturelle avec 11 types de props (Tiers 1, 2 et 3) avec masse, points et gabarits progressifs.
* **Filtrage Dynamique de Collision :** Retrait instantané de la collision sol dès franchissement de la zone d'ingestion pour les objets compatibles.
* **Forces de Succion & Gravité Accrue :** Vortex centripète et chute amplifiée dans l'Abîme.
* **Scaling Continu & Suivi de Caméra :** Agrandissement fluide du Trou et dézoom adaptatif de la caméra orbitale.
* **Mode Arcade 2 Minutes :** Chronomètre avec compte à rebours, jauge de progression, bilan de fin de partie et replay instantané.

---

## 🗺️ Progression & Roadmap

- [x] **Socle technique :** Vite + TypeScript + Babylon.js 7+ + Havok WASM
- [x] **Rendu & Stencil :** Système de masquage Stencil Buffer (Trou, Sol & Abîme)
- [x] **Contrôles :** Contrôleur de déplacement hybride unifié (Souris, Touch, Clavier)
- [x] **Physique & Spawning :** Arène & génération procédurale d'Entités Avaleuses (Tiers 1 à 3)
- [x] **Physique d'ingestion :** Déclencheur volumétrique & filtrage dynamique de collision Havok
- [x] **Boucle de gameplay :** Ingestion, jauge de croissance & scaling dynamique du Trou
- [x] **HUD & Game Loop :** Interface Babylon GUI, mode Chrono 2 min & écrans de jeu
- [x] **QA & Polish :** Optimisations finales, feedback visuel, audit de performance & documentation complète

---

## 🛠️ Développement Local

```bash
# Cloner le dépôt
git clone https://github.com/DevOpsBenjamin/sinkhole.git
cd sinkhole

# Installer les dépendances
npm install

# Démarrer le serveur de développement local
npm run dev

# Compiler et valider la production
npm run build
```

---

## 📄 Architecture & ADRs

Toutes les décisions de conception sont documentées dans `docs/adr/` :
- `0001` : Initialisation du socle technique Vite + TypeScript + Babylon.js 7 + Havok WASM
- `0002` : Architecture du gestionnaire de scène et pipeline de rendu
- `0003` : Masquage Stencil Buffer multi-passes pour le Trou, le Sol et l'Abîme
- `0004` : Contrôleur de déplacement hybride (Souris, Touch, Clavier) et suivi caméra
- `0005` : Génération procédurale d'Entités Avaleuses (Tiers 1 à 3) et physique Havok
- `0006` : Déploiement continu automatisé sur GitHub Pages
- `0007` : Déclencheur d'ingestion, filtrage dynamique de collision Havok et force d'aspiration
- `0008` : Boucle d'ingestion, système de croissance et scaling dynamique du trou
- `0009` : Interface utilisateur Babylon GUI, machine à états et mode Chrono 2 minutes
- `0010` : Validation MVP, optimisations de performance, équilibrage et clôture

---

## 📄 Licence

MIT License © 2026 DevOpsBenjamin
