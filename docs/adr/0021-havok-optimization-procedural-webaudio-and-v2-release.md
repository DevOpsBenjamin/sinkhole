# 21. Optimisations Physiques Havok, Synthèse WebAudio Réactive et Déploiement v2.0

Date : 2026-08-22

## Statut

Accepté

## Contexte

Pour délivrer une expérience de jeu de qualité console fluide à 60 FPS constants sur un planétoïde complet avec 150+ corps rigides et des transitions d'échelle géantes, le moteur doit optimiser la simulation physique Havok, intégrer des retours sonores immersifs sans latence de téléchargement de fichiers externes, et automatiser le déploiement de la version 2.0 sur GitHub Pages.

## Décision

1. **Optimisations Physiques Havok** :
   - Amortissement linéaire et angulaire (`linearDamping: 0.85`, `angularDamping: 0.85`) pour une stabilisation naturelle des corps rigides sur la courbure sphérique.
   - Alignement rigoureux des formes de collision géométriques (`PhysicsShapeBox`, `PhysicsShapeCylinder`, `PhysicsShapeSphere`) avec offset barycentrique au centre de gravité $(0,0,0)$.
   - Gravité centripète continue calculée individuellement par masse réelle sans accumulation de couples parasites.

2. **Synthèse Audio Procédurale WebAudio (`AudioManager`)** :
   - Moteur sonore pur WebAudio sans dépendances d'assets :
     - Ingestion adaptative par Tier et masse (pop aigu $\to$ thud percussif $\to$ bang lourd $\to$ rumble sub-bass tellurique).
     - Arpeggios harmoniques ascendants lors des montées de niveau.
     - Fanfare de triomphe polyphonique lors de la victoire Speedrun 100%.

3. **Pipeline CI/CD GitHub Pages (`.github/workflows/deploy.yml`)** :
   - Workflow d'intégration et déploiement automatisé sur la branche `main` pour publication de la release v2.0.

## Conséquences

### Positives
- Fluidité maximale 60 FPS constants sur navigateur moderne.
- Feedback sonore riche, immersif et instantané sans latence de chargement.
- Déploiement automatisé et accessible publiquement sur GitHub Pages.
