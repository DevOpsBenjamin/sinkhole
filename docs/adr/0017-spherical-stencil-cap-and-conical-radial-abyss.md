# 17. Découpe Stencil en Calotte Sphérique et Abîme Conique Radial

Date : 2026-08-22

## Statut

Accepté

## Contexte

Avec le passage à un planétoïde sphérique ($R = 35.0\text{ m}$), l'utilisation d'un masque Stencil planaire (disque 2D) et d'un cylindre vertical droit entraînait des artefacts géométriques et visuels majeurs à mesure que le trou grandissait :
1. **Effet de plan sécant** : Un disque plat tangent à la surface sphérique s'éloigne de la surface aux extrémités (flèche $\delta = R - \sqrt{R^2 - r^2}$ pouvant atteindre plusieurs dizaines de centimètres pour de grands rayons), créant des occlusions parasites au-dessus du sol.
2. **Abîme cylindrique droit non radial** : Un puits cylindrique droit ne converge pas vers le cœur du globe et traverse obliquement les parois internes du planétoïde.

## Décision

1. **Masque Stencil en Calotte Sphérique Concentrique** :
   - Génération dynamique d'un maillage en calotte sphérique (`VertexData`) concentrique avec le globe ($R_{planet} = 35.0\text{ m}$), décalé d'une garde de sécurité $\epsilon = +0.03\text{ m}$ au-dessus de la surface.
   - Les sommets du maillage suivent la formule $Y_{local}(\rho) = \sqrt{R^2 - \rho^2} - R + \epsilon$ pour $\rho \in [0, r_{hole}]$, garantissant une découpe sans interférence ni clipping artefact quel que soit le rayon du trou.

2. **Abîme en Tronc de Cône Radial** :
   - Remplacement du cylindre droit par un tronc de cône (`cap: Mesh.NO_CAP`) convergeant vers $(0,0,0)$ avec un diamètre au sommet $D_{top} = 2r$ et un diamètre au fond $D_{bottom} = 2r \cdot \frac{R - \text{depth}}{R}$.
   - Positionnement en hauteur ajusté sur le cercle d'intersection de la sphère : $Y_{top} = \sqrt{R^2 - r^2} - R$.
   - Fond de l'Abîme et anneau de bordure (`holeRim`) calés exactement sur l'altitude de l'intersection sphérique.

3. **Colliders Coniques Havok** :
   - 12 colliders physiques Havok de parois (`PhysicsShapeBox` dans `PhysicsShapeContainer`) inclinés selon l'angle de dépouille radial $\alpha = \arctan\left(\frac{r_{top} - r_{bottom}}{\text{depth}}\right)$.

## Conséquences

### Positives
- Découpe Stencil continue et propre sur surface sphérique 3D sans effet de plan sécant.
- Puits sans fond orienté naturellement vers le centre du monde.
- Collisions internes stables guidant les entités ingérées vers le vortex central.
