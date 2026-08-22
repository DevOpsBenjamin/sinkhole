# 18. Déplacement Géodésique Sphérique et Caméra Orbitale au Dézoom Révélateur

Date : 2026-08-22

## Statut

Accepté

## Contexte

Dans la vision *Sinkhole Planet* inspirée de *Katamari Damacy*, le joueur commence au sol à l'échelle micro sans percevoir la courbure planétaire. À mesure qu'il grandit, le dézoom révèle la planète sphérique 3D dans toute son ampleur.

Deux défis majeurs devaient être résolus :
1. **Navigation continue sur $S^2$** : Le déplacement cartésien plan $(X, Z)$ bloquait le trou au dôme polaire et créait des singularités aux pôles et aux flancs du globe.
2. **Caméra 6-DOF adaptative** : Une caméra standard à repère cartésien fixe $(0, 1, 0)$ ne pouvait pas orbiter autour des flancs et du pôle Sud sans inversion de l'axe vertical ou occlusion.

## Décision

1. **Intégration Géodésique sur Grand Cercle (Great-Circle Geodesic Step)** :
   - Déplacement par rotation infinitésimale sur la sphère unité :
     $$\mathbf{a} = \frac{\mathbf{n} \times \mathbf{u}_{move}}{\|\mathbf{n} \times \mathbf{u}_{move}\|}, \quad \Delta\theta = \frac{\|\mathbf{v}\| \cdot \Delta t}{R}, \quad Q = \text{Quaternion.RotationAxis}(\mathbf{a}, \Delta\theta)$$
   - Transport parallèle du vecteur de cap de caméra (`camHeading`) le long de la trajectoire pour maintenir des contrôles relatifs à l'écran (Haut/Bas/Gauche/Droite) constants et intuitifs partout sur le globe sans singularité polaire ni gimbal lock.

2. **Caméra Orbitale Révélatrice (TargetCamera)** :
   - Alignement dynamique du vecteur `camera.upVector` sur la normale locale sortante $\mathbf{n} = \frac{\mathbf{P}_{hole}}{\|\mathbf{P}_{hole}\|}$.
   - Formule de distance Katamari :
     $$d(r) = 7.5 + 5.8 \cdot (r - 0.8)^{0.82}$$
   - Formule d'inclinaison de plongée (pitch) :
     $$\phi(r) = 0.68 + 0.47 \cdot \sqrt{\min\left(1.0, \frac{r - 0.8}{18.0}\right)}$$
   - Transition continue d'une vue intime au sol ($d = 7.5\text{ m}, \phi = 39^\circ$) vers une vue orbitale panoramique globale ($d > 60\text{ m}, \phi = 66^\circ$).

## Conséquences

### Positives
- Liberté totale de circulation à $360^\circ$ sur toute la surface de la planète.
- Révélation d'échelle vertigineuse et spectaculaire (Katamari-style) au fur et à mesure de l'ingestion.
- Robustesse mathématique absolue sans singularité ni gimbal lock.
