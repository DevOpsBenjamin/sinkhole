# 15. Gravité Physique Naturelle, Suppression du Rétrécissement Artificiel et Élimination des Ombres Souterraines

Date : 2026-08-22

## Statut

Accepté

## Contexte

Les observations sur le comportement de chute ont mis en évidence trois points d'ajustement :
1. **Accélération perçue trop rapide** : La combinaison d'une vitesse descendante initiale, d'une gravité accrue ($1.3\times$) et d'une force d'aspiration verticale additionnelle provoquait une accélération globale excessive ($\approx 16.2\text{ m/s}^2$).
2. **Rétrécissement d'échelle artificiel** : Une réduction programmée du maillage ($1.0 \to 0.2$) créait une distorsion visuelle en superposition avec la perspective 3D native de la caméra.
3. **Ombres fantômes sur le plan de sol** : Les objets continuant d'être enregistrés comme lanceurs d'ombre (`shadowCasters`) auprès de la lumière directionnelle même après avoir franchi $Y \le 0$, leurs ombres continuaient d'être projetées sur la surface du sol au-dessus du trou.

## Décision

1. **Suppression du Rétrécissement Artificiel** :
   - Les objets conservent leur échelle physique réelle (`scale = 1.0`) tout au long de la chute. L'effet de profondeur repose exclusivement sur la perspective conique native de la caméra 3D.

2. **Gravité Naturelle Standard ($g = 9.81\text{ m/s}^2$)** :
   - Rétablissement du coefficient de gravité standard : `DOWNWARD_EXTRA_GRAVITY = 1.0`.
   - Suppression de toute force d'attraction vers le bas ($F_y = 0$). Seul le centrage centripète horizontal $(F_x, F_z)$ et la gravité terrestre animent la descente.
   - Durée de chute étirée à $\approx 1.8 - 2.0\text{ s}$ pour un rendu physique très fluide et lisible.

3. **Suppression Dynamique des Ombres Portées en Sous-sol** :
   - Dès qu'un objet bascule dans le trou (`isFallingInHole = true`), il est immédiatement retiré de la liste des générateurs d'ombres (`shadowGenerator.removeShadowCaster(entity.mesh)`).
   - Aucune ombre résiduelle n'est ainsi projetée sur la surface de l'arène pour un objet se trouvant en sous-sol.

## Conséquences

### Positives
- Rendu visuel 100% réaliste et naturel de la physique de chute et de perspective.
- Disparition complète des ombres anormales sur le plan de sol.
- Validé par des tests automatisés Playwright.
