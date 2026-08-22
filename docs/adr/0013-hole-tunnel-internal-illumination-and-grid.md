# 13. Illumination Interne du Tunnel et Texture Structurelle de Paroi

Date : 2026-08-22

## Statut

Accepté

## Contexte

Bien que la physique de chute ait été étendue à 18 mètres, l'absence d'éclairage sous le plan de sol provoquait un assombrissement quasi-total des objets lorsqu'ils franchissaient $Y \le 0$. Les objets devenaient des silhouettes sombres se découpant mal sur un fond noir, donnant l'impression trompeuse de "traverser un plan noir" au lieu de "chuter dans un tunnel 3D".

## Décision

1. **Source Lumineuse Interne (`PointLight`)** :
   - Ajout d'une source lumineuse ponctuelle cyan/bleu clair (`diffuse = (0.65, 0.8, 1.0)`, `intensity = 2.2`, `range = 35.0`) solidaire du trou (`holeRoot`) à $Y = -3.0$ m.
   - Cette lumière éclaire directement l'intérieur du tunnel et les objets en cours de chute, préservant leurs couleurs, arêtes, facettes et reflets 3D tout au long de leur plongeon.

2. **Texture de Paroi Structurelle Haute Définition** :
   - Paroi du cylindre enrichie avec des anneaux de niveau lumineux (`rgba(100, 200, 255, 0.4)`), des motifs de maillage et des piliers verticaux structurels.
   - Fond d'abîme texturé avec un vortex radial et des cercles concentriques accentuant la perspective vers le point de fuite.

3. **Bordure Extérieure Métallique Haute Brillance** :
   - Épaississement de l'anneau de bordure (`holeRim`) avec éclat spéculaire et couleur émissive douce marquant clairement l'ouverture du puits dans l'arène.

## Conséquences

### Positives
- Perception immédiate et spectaculaire d'un tunnel 3D descendant sous le sol.
- Les objets sont clairement visibles en train de culbuter et descendre à l'intérieur du puits sans perdre leurs textures ni leurs couleurs.
