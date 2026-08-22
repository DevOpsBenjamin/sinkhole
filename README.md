# 🕳️ Sinkhole

> An insatiable physics-driven 3D web game built with **Babylon.js 7+** and **Havok Physics (Wasm)**.

[![CI](https://github.com/DevOpsBenjamin/sinkhole/actions/workflows/ci.yml/badge.svg)](https://github.com/DevOpsBenjamin/sinkhole/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/DevOpsBenjamin/sinkhole/actions/workflows/deploy.yml/badge.svg)](https://github.com/DevOpsBenjamin/sinkhole/actions/workflows/deploy.yml)

🎮 **[Jouer en direct sur GitHub Pages](https://devopsbenjamin.github.io/sinkhole/)**

---

## 🎮 Concept

**Sinkhole** est un jeu d'arcade 3D Web temps réel inspiré du genre "Hole" (*Hole.io*, *Donut County*). 

Le joueur contrôle un trou insatiable qui se déplace sur le sol de l'arène urbaine, dévorant tout sur son passage. En avalant des entités du décor classées par Tiers (cônes, poubelles, bancs, voitures, arbres, camions, maisons), le trou grossit et devient capable d'avaler des structures de plus en plus massives.

---

## ⚡ Tech Stack

- **Moteur 3D :** [Babylon.js 7+](https://www.babylonjs.com/) (WebGL2 & WebGPU)
- **Moteur Physique :** [Havok Physics](https://doc.babylonjs.com/features/featuresDeepDive/physics/havokPlugin) (WebAssembly)
- **Langage & Bundler :** [TypeScript](https://www.typescriptlang.org/) strict + [Vite](https://vitejs.dev/)
- **Effets Visuels :** Masquage Stencil Buffer temps réel pour perforation optique du sol et profondeur infinie de l'Abîme
- **Déploiement :** GitHub Actions & GitHub Pages (Front-End 100% statique avec binaire WASM optimisé)

---

## 🚀 Fonctionnalités & Points Forts Techniques

* **Masquage Stencil Buffer temps réel :** Découpe visuelle du sol sans altérer la géométrie ni générer de recalculs CSG coûteux.
* **Simulation Physique Havok WASM :** Simulation fluide à 60 FPS de dizaines de corps rigides dynamiques subissant gravité et attractions.
* **Contrôleur Hybride Multi-plateformes :** Pilotage fluide et unifié Souris (raycast / drag), Touch (mobile/tablette) et Clavier (WASD / ZQSD / Flèches).
* **Entités Avaleuses par Tiers :** Progression naturelle avec 11 types de props (Tiers 1, 2 et 3) avec masse, points et gabarits progressifs.
* **Suivi de Caméra Lissé :** Cadrage dynamique avec amortissement exponentiel centré sur le trou.

---

## 🗺️ Progression & Roadmap

- [x] **Socle technique :** Vite + TypeScript + Babylon.js 7+ + Havok WASM
- [x] **Rendu & Stencil :** Système de masquage Stencil Buffer (Trou, Sol & Abîme)
- [x] **Contrôles :** Contrôleur de déplacement hybride unifié (Souris, Touch, Clavier)
- [x] **Physique & Spawning :** Arène & génération procédurale d'Entités Avaleuses (Tiers 1 à 3)
- [ ] **Physique d'ingestion :** Déclencheur volumétrique & filtrage dynamique de collision Havok
- [ ] **Boucle de gameplay :** Ingestion, jauge de croissance & scaling dynamique du Trou
- [ ] **HUD & Game Loop :** Interface Babylon GUI, mode Chrono 2 min & écrans de jeu
- [ ] **QA & Polish :** Optimisations finales, feedback visuel & sonore

---

## 🛠️ Développement Local

```bash
# Cloner le dépôt
git clone https://github.com/DevOpsBenjamin/sinkhole.git
cd sinkhole

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev

# Tester la compilation TypeScript et le build de production
npm run build
```

---

## 📄 Licence

MIT License © 2026 DevOpsBenjamin
