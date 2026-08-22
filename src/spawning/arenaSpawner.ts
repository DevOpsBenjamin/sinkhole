import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { GAME_CONFIG } from '../config/constants';
import { PropFactory } from '../factories/propFactory';
import { PropType, SwallowableEntity } from '../entities/swallowableEntity';

export interface BiomeConfig {
  name: string;
  minColatitude: number; // in radians [0, PI]
  maxColatitude: number; // in radians [0, PI]
  propCount: number;
  propPool: { type: PropType; weight: number; minDistance: number }[];
}

export const CONCENTRIC_BIOMES: BiomeConfig[] = [
  // 1. Biome Micro (Pôle Nord & Parc Intime : r = 0.8m -> 2.0m)
  {
    name: 'Parc Intime (Micro)',
    minColatitude: 0.08, // ~2.8m d'arc
    maxColatitude: 0.48, // ~16.8m d'arc
    propCount: 38,
    propPool: [
      { type: PropType.TRAFFIC_CONE, weight: 3, minDistance: 1.6 },
      { type: PropType.SODA_CAN, weight: 4, minDistance: 1.2 },
      { type: PropType.FLOWER_POT, weight: 3, minDistance: 1.4 },
      { type: PropType.TRASH_BIN, weight: 3, minDistance: 1.8 },
      { type: PropType.WOODEN_CRATE, weight: 2, minDistance: 2.0 },
      { type: PropType.SMALL_BUSH, weight: 2, minDistance: 2.2 },
      { type: PropType.PARK_BENCH, weight: 1, minDistance: 3.0 },
    ],
  },
  // 2. Biome Banlieue Résidentielle (Quartier pavillonnaire : r = 2.0m -> 4.5m)
  {
    name: 'Quartier Résidentiel',
    minColatitude: 0.42, // ~14.7m d'arc
    maxColatitude: 1.15, // ~40.2m d'arc
    propCount: 45,
    propPool: [
      { type: PropType.SEDAN_CAR, weight: 4, minDistance: 3.2 },
      { type: PropType.STREET_LAMP, weight: 4, minDistance: 2.8 },
      { type: PropType.LARGE_TREE, weight: 3, minDistance: 3.5 },
      { type: PropType.PARK_BENCH, weight: 2, minDistance: 2.5 },
      { type: PropType.HOUSE_PAVILION, weight: 2, minDistance: 5.5 },
      { type: PropType.BUS_STOP, weight: 1, minDistance: 4.5 },
      { type: PropType.DELIVERY_TRUCK, weight: 1, minDistance: 4.8 },
    ],
  },
  // 3. Biome Centre Urbain & Boulevard (Équateur planétaire : r = 4.5m -> 9.0m)
  {
    name: 'Mégalopole Urbaine',
    minColatitude: 1.05, // ~36.7m d'arc
    maxColatitude: 2.15, // ~75.2m d'arc (entoure l'équateur PI/2)
    propCount: 42,
    propPool: [
      { type: PropType.DELIVERY_TRUCK, weight: 3, minDistance: 4.5 },
      { type: PropType.CITY_BUS, weight: 3, minDistance: 5.2 },
      { type: PropType.APARTMENT_BUILDING, weight: 3, minDistance: 6.8 },
      { type: PropType.OFFICE_BLOCK, weight: 2, minDistance: 7.5 },
      { type: PropType.HOUSE_PAVILION, weight: 1, minDistance: 5.5 },
      { type: PropType.LARGE_TREE, weight: 2, minDistance: 3.8 },
    ],
  },
  // 4. Biome Métropolitain & Gratte-ciels (Pôle Sud / Giga-Macro : r = 10.0m -> 25.0m)
  {
    name: 'Complexe Métropolitain (Pôle Sud)',
    minColatitude: 2.05, // ~71.7m d'arc
    maxColatitude: 3.08, // ~107.8m d'arc (fond du pôle Sud)
    propCount: 25,
    propPool: [
      { type: PropType.SKYSCRAPER_TOWER, weight: 4, minDistance: 8.5 },
      { type: PropType.COMMUNICATION_TOWER, weight: 2, minDistance: 10.0 },
      { type: PropType.OFFICE_BLOCK, weight: 3, minDistance: 7.5 },
      { type: PropType.APARTMENT_BUILDING, weight: 2, minDistance: 7.0 },
    ],
  },
];

/**
 * Gestionnaire de génération procédurale par Biomes Concentriques sur le Planétoïde.
 */
export class ArenaSpawner {
  public readonly scene: Scene;
  private entities: SwallowableEntity[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Génère l'ensemble des entités planétaires réparties par biomes concentriques.
   */
  public spawnArena(factory: PropFactory): void {
    this.clearEntities();

    const planetRadius = GAME_CONFIG.PLANET.RADIUS;
    const spawnedDirections: Vector3[] = [];

    for (const biome of CONCENTRIC_BIOMES) {
      // Construction de la file d'attente pondérée du biome
      const totalWeight = biome.propPool.reduce((sum, item) => sum + item.weight, 0);
      const biomeQueue: { type: PropType; minDistance: number }[] = [];

      for (const item of biome.propPool) {
        const count = Math.max(1, Math.round((item.weight / totalWeight) * biome.propCount));
        for (let i = 0; i < count; i++) {
          biomeQueue.push({ type: item.type, minDistance: item.minDistance });
        }
      }

      // Mélange aléatoire des entités du biome
      biomeQueue.sort(() => Math.random() - 0.5);

      for (const item of biomeQueue) {
        let candidateDir: Vector3 | null = null;
        let attempts = 0;

        while (attempts < 60) {
          attempts++;

          // Échantillonnage de colatitude dans l'anneau du biome
          const phi = biome.minColatitude + Math.random() * (biome.maxColatitude - biome.minColatitude);
          const theta = Math.random() * Math.PI * 2;

          const sinPhi = Math.sin(phi);
          const cosPhi = Math.cos(phi);

          const nx = sinPhi * Math.cos(theta);
          const ny = cosPhi;
          const nz = sinPhi * Math.sin(theta);

          const dir = new Vector3(nx, ny, nz);

          // Vérification de distance d'arc avec les voisins
          const tooClose = spawnedDirections.some((otherDir) => {
            const dot = Math.max(-1, Math.min(1, Vector3.Dot(dir, otherDir)));
            const arcDist = Math.acos(dot) * planetRadius;
            return arcDist < item.minDistance;
          });

          if (!tooClose) {
            candidateDir = dir;
            break;
          }
        }

        if (!candidateDir) {
          const phi = biome.minColatitude + Math.random() * (biome.maxColatitude - biome.minColatitude);
          const theta = Math.random() * Math.PI * 2;
          candidateDir = new Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
        }

        spawnedDirections.push(candidateDir);

        const surfacePos = candidateDir.scale(planetRadius);
        const normal = candidateDir.clone();
        const azimuthAngle = Math.random() * Math.PI * 2;

        const entity = factory.createPropOnSphere(item.type, surfacePos, normal, azimuthAngle);
        this.entities.push(entity);
      }
    }

    console.log(`[ArenaSpawner] Successfully populated planetoid with ${this.entities.length} props across 4 concentric biomes.`);
  }

  public getBiomeNameForPosition(pos: Vector3): string {
    const normal = pos.clone().normalize();
    const colatitude = Math.acos(Math.max(-1, Math.min(1, normal.y)));

    for (const biome of CONCENTRIC_BIOMES) {
      if (colatitude >= biome.minColatitude && colatitude <= biome.maxColatitude) {
        return biome.name;
      }
    }
    return 'Surface Planétaire';
  }

  public getEntities(): SwallowableEntity[] {
    return this.entities;
  }

  public removeEntity(id: string): void {
    const index = this.entities.findIndex((e) => e.id === id);
    if (index !== -1) {
      const [removed] = this.entities.splice(index, 1);
      removed.dispose();
    }
  }

  public clearEntities(): void {
    for (const entity of this.entities) {
      entity.dispose();
    }
    this.entities = [];
  }

  public dispose(): void {
    this.clearEntities();
  }
}

