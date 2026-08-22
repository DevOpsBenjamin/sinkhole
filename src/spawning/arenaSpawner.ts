import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { GAME_CONFIG } from '../config/constants';
import { PropFactory } from '../factories/propFactory';
import { PropType, SwallowableEntity } from '../entities/swallowableEntity';

export interface SpawnerConfig {
  totalPropsCount: number;
  centerExclusionRadius: number;
  tier1Ratio: number;
  tier2Ratio: number;
  tier3Ratio: number;
}

const DEFAULT_SPAWNER_CONFIG: SpawnerConfig = {
  totalPropsCount: 65,
  centerExclusionRadius: 5.0,
  tier1Ratio: 0.6,
  tier2Ratio: 0.3,
  tier3Ratio: 0.1,
};

/**
 * Gestionnaire de génération procédurale et de confinement spatial de l'Arène.
 */
export class ArenaSpawner {
  public readonly scene: Scene;
  private config: SpawnerConfig;
  private entities: SwallowableEntity[] = [];

  constructor(scene: Scene, config: Partial<SpawnerConfig> = {}) {
    this.scene = scene;
    this.config = { ...DEFAULT_SPAWNER_CONFIG, ...config };
  }

  /**
   * Génère les entités de l'arène avec une distribution sphérique équilibrée par Tiers sur le globe.
   */
  public spawnArena(factory: PropFactory): void {
    this.clearEntities();

    const planetRadius = GAME_CONFIG.PLANET.RADIUS;

    const tier1Types = [
      PropType.TRAFFIC_CONE,
      PropType.TRASH_BIN,
      PropType.WOODEN_CRATE,
      PropType.SMALL_BUSH,
    ];
    const tier2Types = [
      PropType.PARK_BENCH,
      PropType.STREET_LAMP,
      PropType.SEDAN_CAR,
      PropType.LARGE_TREE,
    ];
    const tier3Types = [
      PropType.DELIVERY_TRUCK,
      PropType.BUS_STOP,
      PropType.HOUSE_PAVILION,
    ];

    const countTier1 = Math.floor(this.config.totalPropsCount * this.config.tier1Ratio);
    const countTier2 = Math.floor(this.config.totalPropsCount * this.config.tier2Ratio);
    const countTier3 = this.config.totalPropsCount - countTier1 - countTier2;

    const spawnQueue: { type: PropType; minDistance: number }[] = [];

    for (let i = 0; i < countTier1; i++) {
      spawnQueue.push({ type: tier1Types[i % tier1Types.length], minDistance: 2.0 });
    }
    for (let i = 0; i < countTier2; i++) {
      spawnQueue.push({ type: tier2Types[i % tier2Types.length], minDistance: 3.8 });
    }
    for (let i = 0; i < countTier3; i++) {
      spawnQueue.push({ type: tier3Types[i % tier3Types.length], minDistance: 6.0 });
    }

    // Mélange de la file de spawn pour une répartition homogène
    spawnQueue.sort(() => Math.random() - 0.5);

    const spawnedDirections: Vector3[] = [];

    for (const item of spawnQueue) {
      let candidateDir: Vector3 | null = null;
      let attempts = 0;

      while (attempts < 50) {
        attempts++;
        // Échantillonnage uniforme sur la sphère unité
        // u = cos(phi) in [-1, 1], theta in [0, 2*PI]
        const u = Math.random() * 2 - 1;
        const theta = Math.random() * Math.PI * 2;
        const rCircle = Math.sqrt(Math.max(0, 1 - u * u));
        const nx = rCircle * Math.cos(theta);
        const ny = u;
        const nz = rCircle * Math.sin(theta);

        const dir = new Vector3(nx, ny, nz);

        // Distance angulaire par rapport au Pôle Nord (spawn initial du Trou à (0, 1, 0))
        const dotPole = Math.max(-1, Math.min(1, dir.y));
        const angularDistToPole = Math.acos(dotPole);
        const arcToPole = angularDistToPole * planetRadius;

        if (arcToPole < this.config.centerExclusionRadius) {
          continue;
        }

        // Vérification de la distance minimale d'arc par rapport aux objets déjà placés
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
        // Position de secours si l'échantillonnage aléatoire s'est heurté à des collisions
        const theta = Math.random() * Math.PI * 2;
        const u = -0.6 + Math.random() * 1.2; // Évite les pôles extrêmes
        const rCircle = Math.sqrt(Math.max(0, 1 - u * u));
        candidateDir = new Vector3(rCircle * Math.cos(theta), u, rCircle * Math.sin(theta));
      }

      spawnedDirections.push(candidateDir);

      const surfacePos = candidateDir.scale(planetRadius);
      const normal = candidateDir.clone();
      const azimuthAngle = Math.random() * Math.PI * 2;

      const entity = factory.createPropOnSphere(item.type, surfacePos, normal, azimuthAngle);
      this.entities.push(entity);
    }

    console.log(`[ArenaSpawner] Spawned ${this.entities.length} interactive entities spherically across planetoid.`);
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
