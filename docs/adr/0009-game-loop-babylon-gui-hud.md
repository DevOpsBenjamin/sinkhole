# 9. Interface Utilisateur Babylon GUI, Machine à États et Mode Chrono 2 minutes

Date : 2026-08-22

## Statut

Accepté

## Contexte

Pour transformer le prototype technique en une expérience de jeu complète et engageante, **SinkHole** nécessite :
1. Une interface utilisateur (UI) native 2D responsive pour le HUD, les menus et les écrans de fin.
2. Une machine à états de jeu (`GameStateManager` / `GameManager`) orchestrant les phases : Accueil / Prêt, Partie en cours (Chronomètre 2 minutes) et Fin de partie (Game Over).
3. Une réinitialisation instantanée (*Restart*) réinitialisant le trou, la caméra, la physique, le score et régénérant l'arène sans rechargement de page.

## Décision

1. **Interface Utilisateur 2D Babylon GUI (`src/ui/uiManager.ts`)** :
   - Initialisation via `AdvancedDynamicTexture.CreateFullscreenUI("HUD", true, scene)`.
   - Éléments stylisés et responsifs (desktop, tablette, mobile) :
     - **Écran d'Accueil / Menu** : Titre stylisé, résumé des contrôles (Souris, Tactile, ZQSD/WASD) et bouton "JOUER".
     - **HUD en direct** :
       - Timer centré (`MM:SS`, initialisé à 02:00, alerte visuelle sous les 15 secondes).
       - Compteur de score et d'objets avalés en haut à droite.
       - Badge de niveau et jauge de progression ($0 \to 100\%$) en haut à gauche.
       - Notification temporaire "LEVEL UP" lors du passage d'un palier.
     - **Écran Game Over** : Bilan de la partie (Score total, Objets avalés, Niveau atteint) et bouton "REJOUER".

2. **Machine à États de Jeu (`src/gameplay/gameManager.ts`)** :
   - `GameState` : `MENU`, `PLAYING`, `GAME_OVER`.
   - Contrôle du chronomètre (120 secondes avec décrémentation précise par deltaTime).
   - Activation/désactivation conditionnelle du contrôleur du Trou et de l'ingestion physique selon l'état actif.

3. **Protocole de Réinitialisation Complète (`restartGame`)** :
   - Réinitialisation du Trou ($X=0, Z=0$, rayon initial $1.5$ m).
   - Réinitialisation de la caméra (angle et rayon de base $25.0$).
   - Nettoyage et régénération procédurale intégrale de l'arène via `ArenaSpawner`.
   - Remise à zéro du `GrowthManager` (score $0$, masse $0$, niveau $1$).

## Conséquences

### Positives
- **Boucle de jeu complète et autonome** : Le joueur peut enchaîner les parties à l'infini avec un feedback clair sur ses performances.
- **Zéro latence / Seamless Restart** : Aucune recharge de page web n'est requise, tout le cycle mémoire reste fluide et contrôlé.
- **Rendu graphique unifié** : Utilisation exclusive du moteur Babylon GUI intégré au pipeline WebGL/WebGPU.

### Négatives / Contraintes
- La disposition des éléments UI doit utiliser des pourcentages et des alignements adaptatifs pour éviter les chevauchements sur écrans mobiles verticaux ou étroits.
