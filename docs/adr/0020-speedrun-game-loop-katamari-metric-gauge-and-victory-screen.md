# 20. Boucle de Jeu Speedrun, Jauge Métrique Katamari et Victoire 100% de la Planète

Date : 2026-08-22

## Statut

Accepté

## Contexte

Dans la vision de Sinkhole Planet, l'objectif du joueur n'est pas simplement de survivre à un compte à rebours arcade de 2 minutes mais de réaliser l'épuration totale (100%) de la surface planétaire le plus rapidement possible (Speedrun). De plus, pour respecter l'esprit Katamari Damacy, l'interface doit exprimer la taille du trou dans des unités métriques concrètes du monde réel (cm -> m -> km) et situer le joueur dans son biome géographique actuel.

## Décision

1. **Jauge Métrique Katamari en Temps Réel** :
   - Calcul du diamètre métrique $D = 2 \times r_{hole}$.
   - Formatage dynamique :
     - $D < 1.0\text{ m}$ : Centimètres et millimètres (ex: `80cm 0mm`).
     - $D \in [1.0\text{ m}, 1000\text{ m}[$ : Mètres et centimètres (ex: `2m 00cm`, `36m 00cm`).
     - $D \ge 1000\text{ m}$ : Kilomètres (ex: `1.20km`).
   - Affichage combiné avec le Niveau de progression et le Biome géographique courant (Parc Intime, Quartier Résidentiel, Mégalopole Urbaine, Complexe Métropolitain).

2. **Chronomètre Ascendant Speedrun & Épuration du Globe** :
   - Chronomètre de haute précision au format `MM:SS.CC` (minutes, secondes, centièmes).
   - Suivi en temps réel du pourcentage d'épuration planétaire : $P = \min\left(100.0, \frac{\text{score}}{\text{VICTORY\_SCORE}} \times 100\right)\%$.

3. **Condition et Écran de Victoire 100%** :
   - Dès l'atteinte de 100% d'épuration, passage à l'état `GameState.VICTORY`.
   - Gel des contrôles et de la physique, et affichage de l'écran de victoire avec récapitulatif du chrono speedrun, taille finale, score et bouton de relance de run sans rechargement de page.

## Conséquences

### Positives
- Boucle de jeu speedrun addictive et valorisante, invitant à optimiser ses trajectoires à travers les 4 biomes.
- Lisibilité immédiate de l'échelle d'absorption grâce aux unités métriques réelles.
