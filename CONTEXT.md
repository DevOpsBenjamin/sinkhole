# Sinkhole — Ubiquitous Language & Domain Glossary

## Core Concepts

### Le Trou (*The Hole / Sinkhole*)
L'entité principale contrôlée par le joueur. Elle est matérialisée par un disque/cylindre invisible au niveau du sol couplé à un masque stencil et un collider dynamique qui se déplace sur le plan horizontal (X, Z).

### L'Abîme (*The Abyss / Hole Interior*)
Le cylindre ou puits 3D texturé/ombré positionné sous le trou, se déplaçant avec lui, dans lequel tombent les objets avalés pour donner l'illusion d'une profondeur infinie.

### Le Masque Stencil (*Stencil Cutout Mask*)
L'élément de géométrie planaire invisible qui écrit dans le Stencil Buffer afin de découper visuellement le sol au niveau de l'ouverture du trou sans altérer la topologie du maillage de l'arène.

### Entité Avaleuse (*Swallowable Entity / Prop*)
Tout objet interactif du décor (cône, banc, arbre, véhicule, bâtiment) doté d'un corps rigide physique (`PhysicsBody`), d'une forme de collision (`PhysicsShape`) et d'un niveau de taille (`Prop Tier`).

### Niveau de Taille (*Prop Tier / Entity Tier*)
La classification discrète ou dimensionnelle d'un objet déterminant le rayon minimal que le Trou doit atteindre avant de pouvoir l'avaler :
- **Tier 1 (Micro)** : Cônes de signalisation, poubelles, caisses, petits arbustes.
- **Tier 2 (Moyen)** : Bancs, lampadaires, voitures, arbres adultes.
- **Tier 3 (Grand)** : Camions, abribus, petits pavillons.
- **Tier 4 (Massif)** : Immeubles, gratte-ciels, ponts.

### Déclencheur d'Ingestion (*Ingestion Trigger*)
La zone volumétrique (cylindrique ou conique) centrée sur le trou. Dès qu'une *Entité Avaleuse* compatible en taille entre dans ce volume :
1. Sa collision avec le sol est désactivée (modification des masques de collision).
2. Une force d'attraction (suction) et de gravité accrue est appliquée vers le fond de l'abîme.

### Boucle d'Ingestion (*Ingestion Lifecycle*)
Le cycle de vie complet d'un objet avalé : détection dans le déclencheur -> désactivation du contact sol -> chute dans l'abîme -> franchissement du seuil de destruction ($Y < Y_{threshold}$) -> attribution des points -> destruction du mesh et libération des ressources physiques.

### Jauge de Croissance (*Growth Gauge & Scaling*)
Le système de progression qui accumule la masse/valeur des objets ingérés. À chaque palier franchi, le rayon du trou, le masque stencil, le trigger physique et le recul de la caméra augmentent proportionnellement.

### Arène de Jeu (*Urban Arena*)
L'environnement statique (sol, limites de carte, bordures) sur lequel évoluent le trou et les entités physiques.
