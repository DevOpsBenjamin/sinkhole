# 16. Planétoïde Sphérique 3D et Champ de Gravité Radiale Havok

Date : 2026-08-22

## Statut

Accepté

## Contexte

Dans le cadre de la transition vers le concept *Sinkhole Planet* (progression d'échelle vertigineuse Katamari-style), l'arène de jeu passe d'un plan rectangulaire fini ($100\times 100\text{ m}$) ceinturé de murs invisibles à un globe planétoïde 3D continu.

Cette évolution pose deux défis physiques majeurs :
1. **Topologie continue sans bordure** : Le terrain de jeu doit être une variété fermée 3D où les objets peuvent rouler et être explorés à $360^\circ$ sans rencontrer de mur artificiel.
2. **Adhérence et gravité omnidirectionnelle** : Le moteur physique Havok applique par défaut un vecteur gravité constant et unidirectionnel (ex: $(0, -9.81, 0)$). Sur une sphère, un tel champ ferait chuter tous les objets situés sur les flancs et l'hémisphère sud dans le vide cosmique.

## Décision

1. **Géométrie & Collider du Planétoïde** :
   - Remplacement du maillage plan par une sphère géométrique `MeshBuilder.CreateSphere('planetMesh', { diameter: 70, segments: 64 })` de rayon $R = 35.0\text{ m}$.
   - Corps rigide statique Havok associé à une forme physique sphérique exacte `PhysicsShapeSphere(Vector3.Zero(), 35.0)` dotée d'un frottement surfacique élevé ($\mu = 0.7$) et d'une restitution faible ($e = 0.1$).
   - Suppression définitive des 4 murs de bordure rectangulaires (`boundaryWalls`).

2. **Champ de Gravité Radiale Dynamique Havok** :
   - Désactivation de la gravité globale de scène dans Havok : `GAME_CONFIG.PHYSICS.GRAVITY = Vector3.Zero()`.
   - Application d'une force centripète continue dirigée vers le centre du monde $(0,0,0)$ sur chaque corps rigide dynamique à chaque pas de calcul :
     $$\mathbf{F}_g = -\frac{\mathbf{P}}{\|\mathbf{P}\|} \cdot (m \cdot g) \quad \text{avec } g = 9.81\text{ m/s}^2$$
   - Les objets restent ainsi naturellement plaqués, roulent et s'équilibrent sur n'importe quel point de la courbure planétaire.

3. **Génération & Alignement Tangentiel des Entités** :
   - Échantillonnage uniforme des positions à la surface du globe via distribution sphérique aléatoire ($\cos\phi \in [-1, 1], \theta \in [0, 2\pi[$) avec zone d'exclusion autour du point de départ du Trou (Pôle Nord).
   - Orientation angulaire de chaque entité obtenue par composition du quaternion d'alignement $(\mathbf{u}_{up} \to \mathbf{n}_{surface})$ et d'une rotation d'azimut aléatoire $(\theta_{azim})$ autour de la normale locale.

## Conséquences

### Positives
- Espace de jeu 3D sans rupture ni bordures artificielles.
- Comportement physique Havok stable, naturel et immersif sur toute la surface de la sphère.
- Socle architectural débloqué pour la découpe stencil sphérique (#30) et la navigation orbitale (#31).
