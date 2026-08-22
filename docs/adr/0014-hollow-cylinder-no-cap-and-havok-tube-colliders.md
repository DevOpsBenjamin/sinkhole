# 14. Cylindre Ouvert sans Couvercle (NO_CAP) et Colliders Physiques de Parois Havok

Date : 2026-08-22

## Statut

Accepté

## Contexte

Bien que la texture de paroi et l'éclairage aient été intégrés, l'utilisation par défaut du maillage cylindrique créait un disque supérieur fermé (`cap: CAP_ALL`) obstruant visuellement l'ouverture du puits à $Y = 0$, et les objets avalés ne bénéficiaient pas de collisions physiques réelles avec les parois intérieures du cylindre lors de leur chute.

## Décision

1. **Cylindre Intérieur 100% Ouvert (`Mesh.NO_CAP`)** :
   - Configuration explicite `cap: Mesh.NO_CAP` sur le maillage de l'Abîme (`abyssInterior`), garantissant l'absence totale de géométrie supérieure ou de disque occultant à $Y = 0$.
   - L'ouverture donne directement sur l'intérieur texturé du puits et sur le fond du cylindre (`abyssBottom`).

2. **Colliders Physiques de Parois de Tube Havok (`PhysicsShapeContainer`)** :
   - Mise en place d'un corps rigide physique animé (`PhysicsMotionType.ANIMATED`) composé de 12 segments de boîtes disposés en anneau tout au long de la hauteur du cylindre ($Y \in [-0.1, -18.0]$ m).
   - Filtrage de collision dédié : `filterMembershipMask = COLLISION_MASKS.WALL` et `filterCollideMask = COLLISION_MASKS.SWALLOWED`.
   - Les objets avalés tombent à l'intérieur du tube, heurtent et rebondissent physiquement contre les parois intérieures au cours de leur culbute.

3. **Disparition en Profondeur** :
   - Dès qu'un objet atteint le fond de l'Abîme ($Y \le -15.3$ m), il est désalloué de Havok et de la scène, incrémentant le score et la croissance du trou.

## Conséquences

### Positives
- Perspective visuelle continue sans aucune occlusion planaire au sommet du trou.
- Physique de culbute et de rebond réaliste contre les parois du puits.
- Validé par des tests automatisés Playwright attestant de la trajectoire et de la collision dans le tube.
