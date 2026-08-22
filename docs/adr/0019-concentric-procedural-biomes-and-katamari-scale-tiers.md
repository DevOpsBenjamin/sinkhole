# 19. Biomes Concentriques Procéduraux et Tiers Katamari Micro à Giga-Macro

Date : 2026-08-22

## Statut

Accepté

## Contexte

Dans un monde sphérique unifié où le joueur progresse de manière continue à l'échelle Katamari, disposer des entités de manière purement aléatoire et uniforme brise le sentiment de progression d'échelle et expose prématurément de grands objets inavalables dans la zone intime de départ.

## Décision

1. **Architecture des Biomes Concentriques par Anneaux de Colatitude** :
   - Division du planétoïde ($R = 35.0\text{ m}$) en 4 biomes selon l'angle de colatitude $\phi \in [0, \pi]$ depuis le Pôle Nord d'apparition :
     1. **Parc Intime (Micro)** ($\phi \in [0.08, 0.48]$ rad) : 38 entités Tier 1 (canettes, pots de fleurs, cônes, poubelles, caisses, arbustes).
     2. **Quartier Résidentiel (Banlieue)** ($\phi \in [0.42, 1.15]$ rad) : 45 entités Tier 2 & 3 (voitures, lampadaires, arbres, pavillons, bancs).
     3. **Mégalopole Urbaine (Équateur)** ($\phi \in [1.05, 2.15]$ rad) : 42 entités Tier 3 & 4 (camions, bus, immeubles d'habitation, blocs de bureaux).
     4. **Complexe Métropolitain (Pôle Sud / Giga-Macro)** ($\phi \in [2.05, 3.08]$ rad) : 25 entités Tier 4 & 5 (gratte-ciels colossaux 16m, tours de télécommunication 20m).

2. **Échantillonnage Procédural avec Distance d'Arc Minimale** :
   - Échantillonnage uniforme en anneau sphérique : $\phi \in [\phi_{min}, \phi_{max}]$, $\theta \in [0, 2\pi]$.
   - Rejet des candidats selon une distance géodésique d'arc $d = R \cdot \arccos(\mathbf{n}_1 \cdot \mathbf{n}_2) \ge d_{min}$, garantissant une densité équilibrée sans collision d'apparition.

3. **Renouvellement Respectueux du Biome d'Origine** :
   - Lors de l'ingestion d'un objet, le remplacement est réinstancié dans la plage de colatitude de son biome d'origine, maintenant la cohérence écologique de la planète.

## Conséquences

### Positives
- Courbe de progression Katamari naturelle, fluide et gratifiante du sol intime vers l'espace cosmique.
- Répartition harmonieuse de 150 entités interactives 3D avec 100% d'alignement physique Havok.
