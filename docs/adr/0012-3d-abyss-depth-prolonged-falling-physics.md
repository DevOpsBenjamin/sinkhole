# 12. Rendu 3D de l'Abîme, Profondeur Accrue et Chute Prolongée des Objets

Date : 2026-08-22

## Statut

Accepté

## Contexte

À la suite de la résolution du cache de collision Havok, les retours utilisateur ont mis en évidence deux axes d'amélioration visuelle et de gameplay :
1. **Durée de chute perçue trop courte** : Les objets disparaissaient en moins de 0.3 s après avoir franchi l'ouverture, ne laissant pas le temps d'apprécier la chute physique dans le gouffre.
2. **Illusion de profondeur 3D** : L'intérieur du trou apparaissait sous la forme d'un disque noir uniforme et plat sans repères de parallaxe ni sensation de puits ou de cylindre 3D descendant sous le sol.

## Décision

1. **Profondeur d'Abîme Décuplée et Seuil d'Ingestion Approfondi** :
   - Augmentation de la profondeur du cylindre de l'Abîme : `HOLE.DEPTH = 18.0` m (contre $8.0$ m auparavant).
   - Abaissement du seuil de destruction/ingestion : $Y \le -15.3$ m (`-HOLE.DEPTH * 0.85`), offrant une trajectoire de chute verticale prolongée de $1.2$ à $2.0$ secondes.

2. **Physique de Chute Réaliste et Culbutes Angulaires** :
   - Impulsion verticale d'entrée mesurée ($v_y = -1.5$ m/s) et gravité calibrée ($1.3\times$).
   - Application d'un couple angulaire aléatoire tridimensionnel (`applyAngularImpulse`) lors du décrochage, provoquant une rotation, un basculement et une culbute naturelle de l'objet (bancs, voitures, caisses, arbres) lorsqu'il bascule dans le vide.
   - Effet de vortex avec mise à l'échelle progressive ($1.0 \to 0.2$) lors de la descente dans les profondeurs de l'Abîme ($Y \le -1.0$ m vers $-15.0$ m).

3. **Matériau et Texture de Gradient avec Anneaux de Profondeur 3D** :
   - Génération dynamique d'une texture de paroi cylindrique (`DynamicTexture` $256\times 1024$) associant un dégradé vertical lumineux (lèvre supérieure éclairée `#3e4659` $\to$ paroi sombre `#181b24` $\to$ abîme profond `#010103`) et des anneaux de niveau horizontaux (`rgba(255, 255, 255, 0.08)`).
   - Bordure extérieure biseautée (`holeRim`) rehaussée avec un éclat métallique/asphalte offrant un contraste marqué au ras du sol.

## Conséquences

### Positives
- Effet de trou 3D et sensation de vertige/profondeur immédiatement perceptibles sous tous les angles de caméra.
- Chute hautement satisfaisante où le joueur voit distinctement chaque objet culbuter, tournoyer et rétrécir vers le fond de l'abîme pendant plus d'une seconde.
- Validé par des tests automatisés Playwright capturant la cinématique complète de chute.
