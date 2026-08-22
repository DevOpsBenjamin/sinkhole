# 3. Système de masquage Stencil Buffer pour le Trou et rendu de l'Abîme

Date : 2026-08-22

## Statut

Accepté

## Contexte

Dans le jeu **SinkHole**, le joueur contrôle une ouverture circulaire (le *Trou*) qui se déplace sur le sol de l'arène urbaine (*Urban Arena*) et avale des éléments du décor.

Pour matérialiser ce trou dans un moteur 3D temps réel, deux approches sont envisageables :
1. **Modification géométrique dynamique du maillage du sol** (Boolean CSG / découpe temps réel de polygones) : très coûteuse en calcul CPU, génère des allocations mémoire récurrentes, risque de créer du z-fighting ou des instabilités de collision physique.
2. **Masquage par Stencil Buffer (Tampon Pochoir)** : technique purement GPU où un disque planaire invisible écrit une empreinte dans le tampon stencil, empêchant le rendu du sol sur cette zone et révélant la géométrie interne de l'*Abîme* située sous la surface.

## Décision

Nous adoptons la technique du **masquage par Stencil Buffer** couplée aux groupes de rendu (`renderingGroupId`) de Babylon.js :

1. **Configuration du pipeline de rendu multi-passes** :
   - Activation du Stencil Buffer sur le moteur (`Engine({ stencil: true })` et `engine.setStencilBuffer(true)`).
   - Définition de deux passes ordonnées :
     - `Group 0` (*Masque Stencil*) : Nettoyage complet (Color, Depth, Stencil).
     - `Group 1` (*Monde & Abîme*) : Désactivation du nettoyage automatique (`scene.setRenderingAutoClearDepthStencil(1, false, false, false)`) pour conserver l'empreinte stencil et la profondeur.

2. **Le Masque Stencil (`Stencil Cutout Mask`) — Group 0** :
   - Disque planaire fin positionné à $Y = 0$, synchronisé avec le centre et le rayon du Trou.
   - `disableColorWrite = true` et `disableDepthWrite = true` : aucune écriture dans les tampons de couleur et de profondeur.
   - `stencil.enabled = true`, `stencil.func = Constants.ALWAYS`, `stencil.funcRef = 1`, `stencil.opStencilDepthPass = Constants.REPLACE` : écrit systématiquement la valeur `1` dans le stencil buffer sur l'empreinte du trou.

3. **Le Sol de l'Arène (`Urban Arena Ground`) — Group 1** :
   - Plan horizontal statique couvrant l'arène.
   - `stencil.enabled = true`, `stencil.func = Constants.NOTEQUAL`, `stencil.funcRef = 1`, `stencil.opStencilDepthPass = Constants.KEEP` : le sol n'est rendu que là où le stencil est différent de 1. La zone couverte par le masque est ainsi découpée au pixel près.

4. **L'Abîme (`The Abyss / Hole Interior`) — Group 1** :
   - Cylindre 3D orienté vers le bas ($Y \in [-depth, 0]$), avec faces intérieures visibles (`backFaceCulling = false` / `DOUBLESIDE`).
   - Matériau sombre et disque de fond simulant une profondeur infinie.
   - Visible exclusivement à travers la perforation du sol créée par le stencil.

5. **Entité `Hole` (`src/entities/hole.ts`)** :
   - Encapsulation orientée objet regroupant le masque stencil, le cylindre de l'abîme, le disque de fond et une bordure visuelle (*Hole Rim*) sous un `TransformNode` racine.
   - Méthodes `setPosition(x, z)` et `setRadius(r)` pour une synchronisation atomique et réactive.

## Conséquences

### Positives
- **Performance GPU maximale** : Coût CPU quasi-nul (aucun recalcul de géométrie de sol ni allocation mémoire en boucle de rendu).
- **Découpe pixel-perfect** : Résolution visuelle nette de l'ouverture quelle que soit la taille ou la forme de l'arène.
- **Topologie du sol préservée** : Le maillage du sol et sa boîte de collision physique Havok restent simples et statiques.
- **Support naturel des objets tombants** : Les entités descendant sous le niveau $Y=0$ sont masquées sous le sol mais visibles à travers l'ouverture du trou.

### Négatives / Contraintes
- Nécessite un canvas WebGL avec le flag `stencil: true`.
- Tous les objets standards du décor et le sol doivent être assignés au `renderingGroupId = 1` pour respecter l'ordre d'évaluation du pochoir.
