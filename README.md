# 🕳️ Sinkhole

> An insatiable physics-driven 3D web game built with **Babylon.js** and **Havok Physics (Wasm)**.

---

## 🎮 Concept

**Sinkhole** is a fast-paced web arcade game inspired by the classic "Hole" game genre (*Hole.io*, *Donut County*). 

You control a growing hole moving across the ground, devouring everything in your path. As you swallow smaller props (traffic cones, benches, trees), your hole expands, allowing you to swallow larger structures (cars, buildings, skyscrapers).

---

## ⚡ Tech Stack

- **Engine:** [Babylon.js 7+](https://www.babylonjs.com/) (WebGPU & WebGL2)
- **Physics Engine:** [Havok Physics](https://doc.babylonjs.com/features/featuresDeepDive/physics/havokPlugin) (WebAssembly)
- **Language / Bundler:** [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **Visual FX:** Stencil Buffer masking for real-time terrain cutout & hole depth

---

## 🚀 Key Mechanics & Technical Highlights

* **Real-time Stencil Masking:** Clean optical illusion of ground perforation without costly mesh boolean operations.
* **Wasm-powered Rigid Body Simulation:** Hundreds of simultaneously active physics bodies powered by Havok's native collision solver.
* **Dynamic Collision Filtering:** Seamless transition of objects from ground colliders into localized gravity triggers.
* **Progressive Growth System:** Real-time scaling of the hole collider, stencil mask, and camera view based on score.

---

## 🗺️ Roadmap & Milestones

- [ ] **Phase 1: Minimal Playable Prototype (PoC)**
  - [ ] Vite + TypeScript + Babylon.js + Havok setup
  - [ ] Player movement controls (Keyboard / Mouse / Touch)
  - [ ] Stencil buffer hole cutout shader & floor depth
  - [ ] Havok physics integration (ground collider + prop spawns)
  - [ ] Collision filter triggers (falling objects + suction)
  - [ ] Score system & hole scaling

- [ ] **Phase 2: Environment & Map Design**
  - [ ] Low-poly procedural or modular city environment
  - [ ] Varied tiers of swallowable items (Tier 1: Trash/Cones, Tier 2: Cars/Trees, Tier 3: Houses, Tier 4: Buildings)
  - [ ] Spawning logic and respawn/drop mechanics

- [ ] **Phase 3: Game Loop & Polish**
  - [ ] Timer / High Score arcade mode
  - [ ] Babylon GUI HUD (Score, Level progress bar, Timer)
  - [ ] Sound FX (Slurp, drop, rumble, level up)
  - [ ] Particle FX on swallowing

---

## 🛠️ Local Development

```bash
# Clone the repository
git clone https://github.com/DevOpsBenjamin/sinkhole.git
cd sinkhole

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## 📄 License

MIT License © 2026 DevOpsBenjamin
