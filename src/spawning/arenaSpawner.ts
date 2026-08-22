import { Scene } from '@babylonjs/core/scene';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import { PhysicsMotionType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { PhysicsShapeBox } from '@babylonjs/core/Physics/v2/physicsShape';
import { COLLISION_MASKS, GAME_CONFIG } from '../config/constants';
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
  private scene: Scene;
  private config: SpawnerConfig;
  private entities: SwallowableEntity[] = [];
  private boundaryMeshes: Mesh[] = [];

  constructor(scene: Scene, config: Partial<SpawnerConfig> = {}) {
    this.scene = scene;
    this.config = { ...DEFAULT_SPAWNER_CONFIG, ...config };
    this.createBoundaryWalls();
  }

  /**
   * Crée 4 murs physiques invisibles autour du périmètre de l'arène pour contenir les entités.
   */
  private createBoundaryWalls(): void {
    const halfSize = GAME_CONFIG.ARENA.SIZE / 2;
    const wallHeight = 6.0;
    const wallThickness = 1.0;

    const wallsData = [
      { name: 'northWall', pos: new Vector3(0, wallHeight / 2, halfSize), size: new Vector3(GAME_CONFIG.ARENA.SIZE, wallHeight, wallThickness) },
      { name: 'southWall', pos: new Vector3(0, wallHeight / 2, -halfSize), size: new Vector3(GAME_CONFIG.ARENA.SIZE, wallHeight, wallThickness) },
      { name: 'eastWall', pos: new Vector3(halfSize, wallHeight / 2, 0), size: new Vector3(wallThickness, wallHeight, GAME_CONFIG.ARENA.SIZE) },
      { name: 'westWall', pos: new Vector3(-halfSize, wallHeight / 2, 0), size: new Vector3(wallThickness, wallHeight, GAME_CONFIG.ARENA.SIZE) },
    ];

    for (const w of wallsData) {
      const wallMesh = MeshBuilder.CreateBox(w.name, { width: w.size.x, height: w.size.y, depth: w.size.z }, this.scene);
      wallMesh.position = w.pos;
      wallMesh.isVisible = false; // Invisible physics barrier

      const wallShape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), w.size, this.scene);
      wallShape.filterMembershipMask = COLLISION_MASKS.WALL;
      wallShape.filterCollideMask = COLLISION_MASKS.PROP | COLLISION_MASKS.SWALLOWED;

      const wallBody = new PhysicsBody(wallMesh, PhysicsMotionType.STATIC, false, this.scene);
      wallBody.shape = wallShape;
      wallBody.setMassProperties({ mass: 0 });

      this.boundaryMeshes.push(wallMesh);
    }
  }

  /**
   * Génère les entités de l'arène avec une distribution spatiale équilibrée par Tiers.
   */
  public spawnArena(factory: PropFactory): void {
    this.clearEntities();

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

    // Shuffle spawn queue for natural dispersion
    spawnQueue.sort(() => Math.random() - 0.5);

    const halfArena = (GAME_CONFIG.ARENA.SIZE / 2) - 4.0; // Keep away from boundary walls
    const spawnedPositions: Vector3[] = [];

    for (const item of spawnQueue) {
      let candidatePos: Vector3 | null = null;
      let attempts = 0;

      while (attempts < 30) {
        attempts++;
        const rx = (Math.random() * 2 - 1) * halfArena;
        const rz = (Math.random() * 2 - 1) * halfArena;

        // Skip central hole spawn area
        if (Math.hypot(rx, rz) < this.config.centerExclusionRadius) {
          continue;
        }

        // Check distance against already spawned positions
        const tooClose = spawnedPositions.some(
          (pos) => Math.hypot(pos.x - rx, pos.z - rz) < item.minDistance
        );

        if (!tooClose) {
          candidatePos = new Vector3(rx, 0, rz);
          break;
        }
      }

      if (!candidatePos) {
        // Fallback position if all random attempts failed
        const angle = Math.random() * Math.PI * 2;
        const dist = this.config.centerExclusionRadius + Math.random() * (halfArena - this.config.centerExclusionRadius);
        candidatePos = new Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
      }

      spawnedPositions.push(candidatePos);
      const rotationY = Math.random() * Math.PI * 2;
      const entity = factory.createProp(item.type, candidatePos, rotationY);
      this.entities.push(entity);
    }

    console.log(`[ArenaSpawner] Spawned ${this.entities.length} interactive entities across arena.`);
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
    for (const wall of this.boundaryMeshes) {
      wall.dispose();
    }
    this.boundaryMeshes = [];
  }
}
