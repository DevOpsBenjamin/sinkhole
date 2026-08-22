# 8. Boucle d'Ingestion, Système de Croissance et Scaling Dynamique du Trou

Date : 2026-08-22

## Statut

Accepté

## Contexte

Dans **SinkHole**, l'essence du gameplay repose sur la boucle de croissance vertueuse :
1. Le joueur commence à petite échelle ($R_{hole} = 1.5$ m, Niveau 1), capable d'avaler uniquement des objets de Tier 1 (cônes, poubelles, caisses, arbustes).
2. L'ingestion d'objets octroie des points et de la masse, faisant progresser la jauge de croissance.
3. À chaque palier de niveau ou gain de masse, le rayon du Trou s'agrandit de manière fluide, permettant de dévorer de nouveaux Tiers d'objets (Tier 2 : bancs, voitures, arbres ; Tier 3 : camions, abribus, pavillons).
4. La caméra doit reculer proportionnellement pour préserver le confort visuel et le cadrage global de l'arène.
5. Les ressources mémoire et physiques des entités englouties doivent être libérées proprement pour garantir un framerate constant à 60 FPS.

## Décision

1. **Cycle de vie d'ingestion et Seuil d'Abîme (`Threshold & Cleanup`)** :
   - Seuil de destruction défini à $Y_{threshold} = -6.0$ m ($75\%$ de la profondeur totale de l'Abîme).
   - Dès franchissement du seuil :
     - Émission de l'événement d'ingestion.
     - Attribution immédiate des points et de la masse au `GrowthManager`.
     - Libération intégrale des composants physiques Havok (`body.dispose()`, `shape.dispose()`) et du maillage Babylon (`mesh.dispose()`) via `ArenaSpawner.removeEntity()`.

2. **Gestionnaire de Croissance & Paliers de Niveau (`src/gameplay/growthManager.ts`)** :
   - Paliers de niveau :
     - **Niveau 1** : $R_{initial} = 1.5$ m, Tiers accessibles : 1 (Seuil niveau suivant : 100 pts).
     - **Niveau 2** : $R_{target} = 2.5$ m, Tiers accessibles : 1 et 2 (Seuil niveau suivant : 450 pts).
     - **Niveau 3** : $R_{target} = 4.2$ m, Tiers accessibles : 1, 2 et 3 (Seuil niveau suivant : 1400 pts).
     - **Niveau 4 (Max)** : $R_{target} = 6.0$ m, Tiers accessibles : Tous.
   - Calcul continu de la progression intra-niveau ($0.0 \to 1.0$) et mise à l'échelle continue du rayon cible $R_{target}$.

3. **Scaling dynamique fluide en temps réel (`Smooth Lerp & Camera Zoom`)** :
   - Interpolation temporelle (lerp amorti) du rayon effectif $R_{hole}$ vers $R_{target}$ à chaque frame.
   - Synchronisation automatique du disque Stencil, du cylindre de l'Abîme, de l'anneau de bordure et de l'Ingestion Trigger.
   - Ajustement exponentiel du rayon de la caméra orbitale :
     $$Radius_{cam} = Radius_{base} \cdot \left(\frac{R_{hole}}{R_{base}}\right)^{0.6}$$
     offrant un dézoom naturel et immersif sans à-coups.

4. **Observables et Événements de Progression** :
   - `onScoreChangedObservable(score: number)`
   - `onLevelUpObservable({ level: number, radius: number })`
   - `onEntitySwallowedObservable(entity: SwallowableEntity)`

## Conséquences

### Positives
- **Feedback gameplay immédiat et gratifiant** : L'agrandissement continu et le recul progressif de la caméra renforcent le sentiment de puissance.
- **Zéro fuite mémoire** : Élimination systématique des corps rigides dès absorption au fond du trou.
- **Architecture découplée** : `GrowthManager` expose des observables purs, facilitant l'intégration de l'interface Babylon GUI (Ticket #8).

### Négatives / Contraintes
- Le déplacement du trou doit conserver sa vitesse maximale ou l'adapter légèrement avec la taille pour garder une maniabilité dynamique.
