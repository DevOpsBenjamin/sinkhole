# Sinkhole — Ubiquitous Language & Domain Glossary

## Core Concepts

### Le Trou (*The Hole / Sinkhole*)
L'entité principale contrôlée par le joueur. Elle est matérialisée par un ensemble synchronisé comprenant un masque stencil planaire au niveau du sol, un cylindre d'Abîme ouvert sous le sol, des colliders physiques de tube Havok, un éclairage interne 3D, un anneau de bordure et un déclencheur d'ingestion qui se déplacent conjointement sur le plan horizontal (X, Z).

### L'Abîme (*The Abyss / Hole Interior*)
Le cylindre 3D 100% ouvert au sommet (`cap: Mesh.NO_CAP`) texturé avec un dégradé d'illumination vertical, une source de lumière interne (`PointLight`), des colliders physiques de parois et des anneaux de profondeur (18 mètres de profondeur), dans lequel tombent, s'illuminent, rebondissent et culbutent les objets avalés jusqu'au fond du puits.

### Le Masque Stencil (*Stencil Cutout Mask*)
L'élément de géométrie planaire invisible (`renderingGroupId = 0`) qui écrit la valeur de référence dans le Stencil Buffer afin de découper visuellement le sol au niveau de l'ouverture du trou sans altérer la topologie du maillage de l'arène.

### Entité Avaleuse (*Swallowable Entity / Prop*)
Tout objet interactif du décor (cône, banc, arbre, véhicule, bâtiment) doté d'un corps rigide physique Havok (`PhysicsBody`), d'une forme de collision (`PhysicsShape`) et d'un niveau de taille (`Prop Tier`).

### Niveau de Taille (*Prop Tier / Entity Tier*)
La classification discrète d'un objet déterminant le rayon minimal que le Trou doit atteindre avant de pouvoir l'avaler :
- **Tier 1 (Micro)** : Cônes de signalisation, poubelles, caisses, petits arbustes ($r_{min} \in [0.8, 1.2]$ m, 10-25 pts).
- **Tier 2 (Moyen)** : Bancs, lampadaires, voitures de ville, arbres adultes ($r_{min} \in [1.6, 2.4]$ m, 50-150 pts).
- **Tier 3 (Grand)** : Camions, abribus, petits pavillons ($r_{min} \in [3.0, 4.5]$ m, 300-650 pts).
- **Tier 4 (Massif)** : Immeubles, gratte-ciels, ponts (extensions futures).

### Déclencheur d'Ingestion (*Ingestion Trigger*)
La zone volumétrique cylindrique centrée sur le trou. Dès qu'une *Entité Avaleuse* compatible en taille entre dans ce volume :
1. Sa collision avec le sol est désactivée (`shape.filterCollideMask`) et son corps Havok est réinitialisé dans le monde pour purger le cache de contact statique.
2. L'objet est retiré des lanceurs d'ombre (`shadowCasters`) pour éliminer toute ombre fantôme projetée en surface.
3. Une légère impulsion angulaire 3D, une force d'attraction centripète horizontale douce vers $(X_{hole}, Z_{hole})$ et la gravité naturelle standard ($1.0\times$) sont appliquées.
4. Les objets trop grands restent en contact avec le sol et subissent une force répulsive d'évitement.

### Boucle d'Ingestion (*Ingestion Lifecycle*)
Le cycle de vie complet d'un objet avalé : détection dans le déclencheur -> chute libre et culbute naturelle dans le tube (1.8 à 2.0 s à échelle physique 1.0) -> franchissement du seuil de destruction ($Y \le -15.3$ m) -> attribution des points et de la masse -> libération intégrale des composants Havok et du maillage -> renouvellement automatique en bordure d'arène.

### Jauge de Croissance (*Growth Gauge & Scaling*)
Le système de progression qui accumule le score et la masse des objets ingérés. À chaque palier franchi, le rayon du trou, le masque stencil, l'Abîme, le trigger physique et le recul de la caméra augmentent proportionnellement et de manière amortie (`Scalar.Lerp`).

### Contrôleur Hybride (*Hybrid Input Controller*)
Le module d'entrée unifié prenant en charge de manière fluide le Clavier (WASD / ZQSD / Flèches), la Souris (raycast au sol $Y=0$ et drag) et l'Écran Tactile (touch drag) avec accélération, friction et confinement dans l'arène.

### Interface & Boucle de Jeu (*HUD & Game Loop*)
L'interface utilisateur native 2D Babylon GUI intégrant le menu de démarrage, le chronomètre arcade de 2 minutes, le score en direct, la jauge de progression, le bilan de fin de partie et le replay sans rechargement de page.

### Arène de Jeu (*Urban Arena*)
L'environnement statique de $100\times 100$ m (sol, limites de carte, bordures physiques invisibles) sur lequel évoluent le trou et les entités physiques.
