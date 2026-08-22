# 11. Résolution du Cache de Collision Havok et Physique de Chute des Entités

Date : 2026-08-22

## Statut

Accepté

## Contexte

Lors des tests interactifs en conditions réelles et sur le serveur local, un comportement physique anormal a été identifié :
- Lorsque le trou se déplace sous des objets avalables (Tiers 1, 2, 3), les entités se déplacent sous l'effet de l'aspiration centripète mais ne tombent pas à travers le sol dans le cylindre du trou.
- L'analyse approfondie des internals du moteur Havok WASM (`@babylonjs/havok` et plugin V2) a révélé que :
  1. Le sol (`groundMesh`) possède un corps statique dans le monde Havok avec un masque de collision `PROP`.
  2. Lorsqu'un objet dynamique repose sur le sol, Havok enregistre et met en cache un collecteur de contacts persistant (*contact manifold cache*) dans ses îles de résolution.
  3. La seule modification dynamique des propriétés `shape.filterMembershipMask` et `shape.filterCollideMask` sur la forme ne purge pas automatiquement les paires de contacts statiques déjà actives pour un corps au repos.
  4. En conséquence, le solveur Havok continue d'appliquer la réaction normale du sol et empêche le corps de traverser le plan de sol $Y = 0$.

## Décision

1. **Cycle de Réinitialisation du Corps dans le Monde Havok (`refreshBodyCollisions`)** :
   - Dans [`IngestionTrigger.ts`](file:///Users/devops.benjamin/Work/SinkHole/src/physics/ingestionTrigger.ts), lors du basculement d'une entité en état de chute (`isFallingInHole = true`) ou lors de la restauration de collision (`restoreGroundCollision`) :
     - Mise à jour immédiate des masques de forme : `filterCollideMask = PROP | WALL | SWALLOWED` et `filterMembershipMask = SWALLOWED`.
     - Purge et rafraîchissement atomique de la paire de contacts dans Havok WASM via :
       ```typescript
       plugin._hknp.HP_World_RemoveBody(plugin.world, body._pluginData.hpBodyId);
       plugin._hknp.HP_World_AddBody(plugin.world, body._pluginData.hpBodyId, false);
       ```
     - Cette réinsertion force Havok à reconstruire ses paires de broadphase en évaluant les nouveaux masques, éliminant instantanément tout contact avec le sol statique.

2. **Impulsion Verticale et Force d'Aspiration Tridimensionnelle** :
   - Application d'une vitesse linéaire descendante initiale ($v_y = -4.0$ m/s) à l'instant d'entrée dans le volume du trou.
   - Application continue d'un vecteur force d'aspiration 3D combinant l'attraction centripète $(F_x, F_z)$ et une composante gravitationnelle descendante accrue ($F_y = -9.81 \times m \times 1.5$) attirant inexorablement les entités vers le fond de l'abîme.
   - Dès que $Y \le -6.0$ m (seuil d'ingestion), l'événement `onEntitySwallowedObservable` est déclenché, incrémentant le score, la taille du trou et recyclant l'entité.

## Conséquences

### Positives
- Chute parfaitement fluide, réactive et naturelle de tous les objets dès qu'ils pénètrent dans le périmètre d'aspiration du trou.
- Élimination totale des blocages au-dessus du sol.
- Validation automatique de gameplay vérifiée par tests automatisés Playwright (chute vérifiée jusqu'au niveau 4 avec 3400+ points).
