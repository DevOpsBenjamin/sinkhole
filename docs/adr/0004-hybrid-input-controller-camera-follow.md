# 4. Contrôleur de déplacement hybride du Trou et suivi de caméra

Date : 2026-08-22

## Statut

Accepté

## Contexte

Dans **SinkHole**, Le Trou (*The Hole*) doit pouvoir être piloté avec une réactivité et une fluidité optimales sur tous les types de périphériques :
- **Desktop** : Souris (drag / cursor follow) et Clavier (WASD / ZQSD / Flèches directionnelles).
- **Mobile / Tablette** : Écran tactile (touch drag / virtual steering).

De plus, la caméra doit accompagner les déplacements du trou de manière souple (*Smooth Target Following* / Lerp) tout en respectant les limites physiques de l'Arène (*Urban Arena Boundaries*).

## Décision

1. **Création du composant `HoleController` (`src/controllers/holeController.ts`)** :
   - Encapsule la gestion des entrées, le calcul de vélocité, l'accélération et le freinage/damping.
   - Met à jour la position du `Hole` à chaque trame dans la boucle de rendu (`scene.onBeforeRenderObservable`) en fonction du `deltaTime`.

2. **Système d'entrées hybride unifié** :
   - **Clavier (WASD / ZQSD / Flèches)** : Écoute globale des événements `keydown` / `keyup` avec gestion des layouts QWERTY et AZERTY. Normalisation du vecteur de direction pour éviter le sur-déplacement en diagonale.
   - **Souris & Touch (Raycasting sol $Y=0$)** : Calcul de l'intersection entre le rayon de vue de la caméra (`scene.createPickingRay`) et le plan horizontal $Y=0$. Déplacement proportionnel et lissé vers la cible pointée.
   - **Fusion sans conflit** : Si une touche clavier est active, elle prend la priorité sur la direction immédiate ; au relâchement, le contrôle pointeur reprend en douceur.

3. **Délimitation de l'Arène (`Arena Clamping`)** :
   - Clamping strict des coordonnées $(X, Z)$ du trou dans l'intervalle $[-\frac{L}{2} + r, \frac{L}{2} - r]$ où $L$ est la taille de l'arène (`GAME_CONFIG.ARENA.SIZE`) et $r$ le rayon courant du trou (`hole.getRadius()`).

4. **Suivi de caméra lissé (`Camera Damping / Smooth Tracking`)** :
   - Désactivation de la rotation manuelle de la caméra au clic gauche pour dédier le curseur au contrôle du trou.
   - Interpolation exponentielle (`Vector3.Lerp` / Damping) de `camera.target` vers la position courante du trou, assurant un cadrage centré sans secousses.

## Conséquences

### Positives
- **Expérience utilisateur native et intuitive** : Fonctionne immédiatement à la souris, au touch tactile ou au clavier sans configuration préalable.
- **Mouvement fluide et sans à-coups** : Modèle physique basé sur la vélocité avec accélération et friction garantissant une inertie plaisante ("juicy gameplay").
- **Confinement garanti** : Le trou ne peut jamais sortir des limites visibles de l'arène.
- **Découplage architectural** : `HoleController` est modulaire, testable et indépendant du rendu du trou.

### Négatives / Contraintes
- Nécessite de désactiver le contrôle d'orbite par défaut d'`ArcRotateCamera` pour éviter les conflits d'événements pointer.
