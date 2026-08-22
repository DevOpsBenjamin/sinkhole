# 5. Génération procédurale d'Entités Avaleuses (Tiers 1 à 3) et physique Havok de l'Arène

Date : 2026-08-22

## Statut

Accepté

## Contexte

Dans **SinkHole**, l'arène urbaine (*Urban Arena*) doit être peuplée d'une variété d'objets interactifs et avalables (*Swallowable Entities / Props*) dotés de corps rigides physiques Havok.

Ces entités doivent :
1. Être classées par **Tiers de progression** (*Prop Tiers*) avec des dimensions, masses et points croissants afin d'alimenter la boucle de gameplay et la jauge de croissance.
2. Disposer de maillages 3D procéduraux colorés, légers et optimisés (faible nombre de polygones, partage de matériaux).
3. Être dotées de corps rigides Havok (`PhysicsBody`) stables et performants avec des formes de collision adaptées (`PhysicsShapeBox`, `PhysicsShapeCylinder`, `PhysicsShapeSphere`).
4. Être réparties équitablement dans l'arène via un générateur spatial procédural évitant les superpositions et dégageant la zone initiale du Trou.
5. Être contenues dans l'arène grâce à des murs de délimitation physiques invisibles.

## Décision

1. **Modèle de données et Classification en Tiers (`src/entities/swallowableEntity.ts`)** :
   - **Tier 1 (Micro)** : Cônes de signalisation, poubelles, caisses en bois, petits arbustes ($r_{min} \in [0.8, 1.2]$, masse $\in [1, 3]$ kg, valeur : 10-25 pts).
   - **Tier 2 (Moyen)** : Bancs de parc, lampadaires, voitures citadines, grands arbres ($r_{min} \in [1.6, 2.4]$, masse $\in [15, 40]$ kg, valeur : 50-150 pts).
   - **Tier 3 (Grand)** : Camions de livraison, abribus, petits pavillons résidentiels ($r_{min} \in [3.2, 4.5]$, masse $\in [120, 350]$ kg, valeur : 300-800 pts).

2. **Fabrique de maillages procéduraux (`src/factories/propFactory.ts`)** :
   - Génération de maillages low-poly assemblés avec matériaux standard optimisés et groupement dans le `renderingGroupId = 1`.
   - Attachement automatique aux ombres portées (`ShadowGenerator.addShadowCaster`).
   - Création de la forme de collision physique Havok associée (`PhysicsShapeBox`, `PhysicsShapeCylinder`, `PhysicsShapeSphere`) avec friction et restitution équilibrées.

3. **Bordures physiques de l'Arène (`Arena Boundary Colliders`)** :
   - 4 murs physiques invisibles statiques (`PhysicsMotionType.STATIC`) d'épaisseur 1m et hauteur 6m entourant le périmètre ($X = \pm 50$, $Z = \pm 50$) pour éviter la chute des entités hors du terrain.

4. **Générateur procédural spatial (`src/spawning/arenaSpawner.ts`)** :
   - Génération distribuée (60% Tier 1, 30% Tier 2, 10% Tier 3) avec espacement anti-collision et exclusion de la zone centrale d'apparition du trou ($r_{clear} = 5$ m).

## Conséquences

### Positives
- **Variété et lisibilité immédiates** : Grande diversité d'objets urbains reconnaissables avec codes couleurs distincts par type.
- **Progression naturelle** : Cohérence entre taille visuelle, masse physique, rayon d'ingestion requis et score accordé.
- **Haute performance à 60 FPS** : Maillages légers, physique Havok WASM native sans saccades même avec une centaine de corps rigides simultanés.
- **Extensibilité** : Ajout aisé de nouveaux types de props ou d'un Tier 4 futur via la fabrique.

### Négatives / Contraintes
- Les maillages composés complexes doivent être fusionnés (`Mesh.MergeMeshes`) ou dotés d'un collider racine simple pour préserver le budget physique Havok.
