# 10. Validation MVP, Optimisations de Performance, Équilibrage et Clôture

Date : 2026-08-22

## Statut

Accepté

## Contexte

Avec l'achèvement de l'ensemble des sous-systèmes techniques et de gameplay :
1. **Socle & Rendu** : Babylon.js 7+, Havok WASM, masquage multi-passes Stencil Buffer.
2. **Contrôles & Caméra** : Pilotage hybride (Clavier, Souris, Touch) avec amortissement et cadrage dynamique.
3. **Physique & Spawning** : Arène urbaine, 11 types de props (Tiers 1 à 3), confinement par murs invisibles.
4. **Physique d'Ingestion & Aspiration** : Filtrage de collision dynamique, force centripète et gravité amplifiée.
5. **Gameplay & Progression** : Boucle de score/masse, 4 niveaux de taille, scaling continu du trou et recul caméra.
6. **Interface & Boucle de Jeu** : Babylon GUI 2D, mode Chrono 2 minutes, écrans Accueil, HUD et Game Over avec replay.
7. **CI/CD & Déploiement** : GitHub Pages en direct avec binaire WASM et chemins relatifs.

Il convient de procéder à la validation QA finale, au calibrage des constantes de jeu, à l'audit de performance et à la formalisation de la documentation finale.

## Décision

1. **Audit de Performance & Stabilité Physique** :
   - **Taux de rafraîchissement** : Maintien constant de 60 FPS sur GPU intégré et dédié.
   - **Gestion mémoire Havok & Babylon** :
     - Chaque entité avalée sous le seuil d'Abîme ($Y \le -6.0$ m) libère instantanément son maillage (`mesh.dispose()`), sa forme (`shape.dispose()`) et son corps physique (`body.dispose()`).
     - Le régénérateur d'arène remplace les objets consommés un à un pour stabiliser la mémoire et maintenir la densité d'objets sans accumulation.
   - **Compilation Stricte & Tree-shaking** :
     - Validation sans avertissement de `tsc --noEmit` et `vite build`.

2. **Équilibrage de Gameplay** :
   - **Vitesse du Trou** : $v_{max} = 22.0$ m/s, accélération $80.0$, friction $8.0$ (maniabilité vive et nerveuse).
   - **Mode Chrono** : 120 secondes ($2$ minutes) calibré pour permettre aux joueurs d'atteindre le Niveau 3 ou 4 avec une trajectoire optimisée.
   - **Paliers de Score** :
     - Niveau 1 $\to$ 2 : 120 pts (accessible après avoir dévoré ~8 objets Tier 1).
     - Niveau 2 $\to$ 3 : 500 pts (accessible après ingestion de voitures, bancs et arbres).
     - Niveau 3 $\to$ 4 : 1500 pts (accessible après ingestion de pavillons et camions).

3. **Documentation & Clôture** :
   - Mise à jour de `README.md` et `CONTEXT.md` pour refléter l'intégralité du produit livré.
   - Publication automatique de la version de production sur GitHub Pages.

## Conséquences

### Positives
- Le MVP de **SinkHole** est 100% opérationnel, jouable, responsive et accessible instantanément dans le navigateur.
- Tous les engagements du cahier des charges et de la feuille de route sont tenus avec une architecture modulaire, typée et documentée via 10 ADRs.
