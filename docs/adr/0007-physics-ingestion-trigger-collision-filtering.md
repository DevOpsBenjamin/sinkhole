# 7. Déclencheur d'Ingestion, Filtrage dynamique de collision Havok et Force d'Aspiration

Date : 2026-08-22

## Statut

Accepté

## Contexte

Dans **SinkHole**, les objets du décor (*Swallowable Entities*) reposent initialement sur le sol de l'arène grâce aux collisions physiques Havok.

Lorsque le Trou (*The Hole*) passe sous un objet :
1. Si le rayon du trou $R_{hole}$ est suffisant pour le gabarit de l'objet (`canBeSwallowedBy(R_hole)`), l'objet doit cesser de heurter le sol pour pouvoir tomber à travers l'ouverture du Stencil dans l'Abîme.
2. Si le trou est trop petit, l'objet doit continuer de reposer sur le sol et être repoussé sur les bords sans traverser le sol.
3. Une force d'aspiration centripète et une gravité verticale accrue doivent attirer l'objet vers le centre et le fond de l'abîme pour offrir une sensation de succion dynamique ("suction juice").

## Décision

1. **Architecture des Masques de Collision Havok (`COLLISION_MASKS`)** :
   - `GROUND (0x0001)` : Sol de l'arène urbaine.
   - `PROP (0x0002)` : Entités avalables.
   - `WALL (0x0004)` : Murs périmétriques invisibles.
   - `SWALLOWED (0x0008)` : Entités en cours d'ingestion.

2. **Composant `IngestionTrigger` (`src/physics/ingestionTrigger.ts`)** :
   - Volume logique cylindrique centré sur le trou $(X_{hole}, 0, Z_{hole})$ de rayon effectif $R_{trigger} = R_{hole} \times 1.05$.
   - Évalué à chaque pas de simulation physique (`scene.onBeforeRenderObservable` / pre-physics step).

3. **Filtrage dynamique de collision temps réel** :
   - **Ingestion autorisée ($R_{hole} \ge R_{required}$)** :
     - Dès pénétration dans le rayon d'ingestion : retrait du masque `GROUND` (`shape.filterCollideMask = PROP | WALL`).
     - L'entité traverse le sol sans résistance mécanique.
     - Augmentation du facteur gravitationnel (`body.setGravityFactor(2.5)`).
   - **Objet trop grand ($R_{hole} < R_{required}$)** :
     - Maintien du contact sol (`GROUND`).
     - Application d'une force répulsive douce vers l'extérieur pour éviter les blocages.

4. **Système de force d'aspiration centripète (`Suction & Vortex Force`)** :
   - Application d'une force vectorielle $\vec{F}_{suction} = \vec{F}_{centripetal} + \vec{F}_{downward}$ :
     $$\vec{F}_{centripetal} = -\frac{\vec{r}}{\|\vec{r}\|} \cdot k_{suction} \cdot m$$
     $$\vec{F}_{downward} = -k_{gravity\_extra} \cdot m \cdot \vec{u}_y$$
   - Assure un plongeon spectaculaire et naturel vers le fond du puits.

## Conséquences

### Positives
- **Transition naturelle sol -> trou** : Disparition instantanée de la friction sol permettant une chute fluide et sans blocage.
- **Ressenti physique dynamique** : La combinaison de l'attraction centripète et de la gravité amplifiée crée un effet de tourbillon d'aspiration très gratifiant.
- **Respect strict des Tiers** : Les gros objets bloquent physiquement sur le trou tant que le rayon nécessaire n'est pas atteint.

### Négatives / Contraintes
- Nécessite de mettre à jour le masque de collision de chaque entité de manière atomique lors de son passage dans la zone du trou.
