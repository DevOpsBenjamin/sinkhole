import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Observable } from '@babylonjs/core/Misc/observable';
import { Scalar } from '@babylonjs/core/Maths/math.scalar';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { GAME_CONFIG } from '../config/constants';
import { Hole } from '../entities/hole';
import { SwallowableEntity } from '../entities/swallowableEntity';
import { IngestionTrigger } from '../physics/ingestionTrigger';
import { ArenaSpawner } from '../spawning/arenaSpawner';
import { PropFactory } from '../factories/propFactory';

export interface ScoreEvent {
  score: number;
  addedPoints: number;
  totalSwallowed: number;
}

export interface LevelUpEvent {
  level: number;
  name: string;
  radius: number;
}

/**
 * Gestionnaire de la boucle d'ingestion, du score et de la croissance continue du Trou.
 */
export class GrowthManager {
  private scene: Scene;
  private camera: ArcRotateCamera;
  private hole: Hole;
  private arenaSpawner: ArenaSpawner;
  private ingestionTrigger: IngestionTrigger;
  private propFactory: PropFactory | null;

  private score = 0;
  private swallowedCount = 0;
  private swallowedMass = 0;
  private currentLevelIndex = 0;
  private currentRadius: number;
  private targetRadius: number;

  public readonly onScoreChangedObservable = new Observable<ScoreEvent>();
  public readonly onLevelUpObservable = new Observable<LevelUpEvent>();
  public readonly onEntitySwallowedObservable = new Observable<SwallowableEntity>();

  private renderObserver: any = null;
  private triggerObserver: any = null;

  constructor(
    scene: Scene,
    camera: ArcRotateCamera,
    hole: Hole,
    arenaSpawner: ArenaSpawner,
    ingestionTrigger: IngestionTrigger,
    propFactory: PropFactory | null = null
  ) {
    this.scene = scene;
    this.camera = camera;
    this.hole = hole;
    this.arenaSpawner = arenaSpawner;
    this.ingestionTrigger = ingestionTrigger;
    this.propFactory = propFactory;

    this.currentRadius = hole.getRadius();
    this.targetRadius = hole.getRadius();

    this.setupListeners();
  }

  private setupListeners(): void {
    // 1. Listen to Ingestion Trigger events
    this.triggerObserver = this.ingestionTrigger.onEntitySwallowedObservable.add(
      (entity: SwallowableEntity) => {
        this.handleEntitySwallowed(entity);
      }
    );

    // 2. Continuous scaling loop (hole mesh + camera zoom)
    this.renderObserver = this.scene.onBeforeRenderObservable.add(() => {
      const dt = this.scene.getEngine().getDeltaTime() / 1000.0;
      this.update(dt);
    });
  }

  private handleEntitySwallowed(entity: SwallowableEntity): void {
    const points = entity.getPoints();
    const mass = entity.definition.mass;

    this.score += points;
    this.swallowedCount++;
    this.swallowedMass += mass;

    // Evaluate progression and update target radius
    this.evaluateLevelProgression();

    // Notify observers
    this.onScoreChangedObservable.notifyObservers({
      score: this.score,
      addedPoints: points,
      totalSwallowed: this.swallowedCount,
    });
    this.onEntitySwallowedObservable.notifyObservers(entity);

    // Clean up entity resources immediately from scene & physics engine
    this.arenaSpawner.removeEntity(entity.id);

    // Respawn replacement prop at arena border to maintain density
    if (this.propFactory) {
      this.respawnReplacementProp(entity);
    }
  }

  private evaluateLevelProgression(): void {
    const levels = GAME_CONFIG.PROGRESSION.LEVELS;
    let newLevelIndex = this.currentLevelIndex;

    // Check if score unlocked higher level
    for (let i = levels.length - 1; i >= 0; i--) {
      if (this.score >= levels[i].requiredScore) {
        newLevelIndex = i;
        break;
      }
    }

    if (newLevelIndex > this.currentLevelIndex) {
      this.currentLevelIndex = newLevelIndex;
      const lvl = levels[this.currentLevelIndex];

      this.onLevelUpObservable.notifyObservers({
        level: lvl.level,
        name: lvl.name,
        radius: lvl.targetRadius,
      });

      console.log(`[GrowthManager] LEVEL UP! Level ${lvl.level} - ${lvl.name} (Radius target: ${lvl.targetRadius}m)`);
    }

    // Compute target radius: Base level target + continuous sub-level mass expansion
    const currentLvl = levels[this.currentLevelIndex];
    const nextLvl = levels[this.currentLevelIndex + 1];

    if (nextLvl) {
      const scoreInCurrentLevel = this.score - currentLvl.requiredScore;
      const scoreNeededForNext = nextLvl.requiredScore - currentLvl.requiredScore;
      const progress = Math.min(1.0, Math.max(0.0, scoreInCurrentLevel / scoreNeededForNext));
      this.targetRadius = currentLvl.targetRadius + (nextLvl.targetRadius - currentLvl.targetRadius) * progress;
    } else {
      // Max level: slight asymptotic growth
      this.targetRadius = currentLvl.targetRadius + Math.log10(1 + (this.score - currentLvl.requiredScore) * 0.001);
    }
  }

  private respawnReplacementProp(previousEntity: SwallowableEntity): void {
    if (!this.propFactory) return;

    const halfArena = (GAME_CONFIG.ARENA.SIZE / 2) - 5.0;
    const angle = Math.random() * Math.PI * 2;
    const distance = halfArena * (0.6 + Math.random() * 0.4);
    const holePos = this.hole.getPosition();
    const spawnPos = new Vector3(
      holePos.x + Math.cos(angle) * distance,
      0,
      holePos.z + Math.sin(angle) * distance
    );

    // Clamp spawn pos within arena
    spawnPos.x = Math.max(-halfArena, Math.min(spawnPos.x, halfArena));
    spawnPos.z = Math.max(-halfArena, Math.min(spawnPos.z, halfArena));
    spawnPos.y = 0;

    const newEntity = this.propFactory.createProp(previousEntity.definition.type, spawnPos, Math.random() * Math.PI * 2);
    this.arenaSpawner.getEntities().push(newEntity);
  }

  public update(deltaTime: number): void {
    if (deltaTime <= 0) return;

    // Smoothly interpolate current hole radius towards target radius
    const growthLerp = Math.min(1.0, deltaTime * GAME_CONFIG.PROGRESSION.GROWTH_LERP_SPEED);
    this.currentRadius = Scalar.Lerp(this.currentRadius, this.targetRadius, growthLerp);
    this.hole.setRadius(this.currentRadius);

    // Smoothly scale camera distance to match larger view
    const initialRadius = GAME_CONFIG.HOLE.INITIAL_RADIUS;
    const radiusRatio = this.currentRadius / initialRadius;
    const targetCameraRadius = GAME_CONFIG.PROGRESSION.BASE_CAMERA_RADIUS * Math.pow(radiusRatio, 0.6);

    const cameraLerp = Math.min(1.0, deltaTime * GAME_CONFIG.PROGRESSION.CAMERA_ZOOM_LERP_SPEED);
    this.camera.radius = Scalar.Lerp(this.camera.radius, targetCameraRadius, cameraLerp);
  }

  // --- Getters ---
  public getScore(): number {
    return this.score;
  }

  public getSwallowedCount(): number {
    return this.swallowedCount;
  }

  public getSwallowedMass(): number {
    return this.swallowedMass;
  }

  public getLevel(): number {
    return GAME_CONFIG.PROGRESSION.LEVELS[this.currentLevelIndex].level;
  }

  public getLevelName(): string {
    return GAME_CONFIG.PROGRESSION.LEVELS[this.currentLevelIndex].name;
  }

  public getLevelProgress(): number {
    const levels = GAME_CONFIG.PROGRESSION.LEVELS;
    const currentLvl = levels[this.currentLevelIndex];
    const nextLvl = levels[this.currentLevelIndex + 1];
    if (!nextLvl) return 1.0;

    const scoreInLevel = this.score - currentLvl.requiredScore;
    const scoreRange = nextLvl.requiredScore - currentLvl.requiredScore;
    return Math.min(1.0, Math.max(0.0, scoreInLevel / scoreRange));
  }

  public getCurrentRadius(): number {
    return this.currentRadius;
  }

  public getTargetRadius(): number {
    return this.targetRadius;
  }

  public reset(): void {
    this.score = 0;
    this.swallowedCount = 0;
    this.swallowedMass = 0;
    this.currentLevelIndex = 0;
    this.currentRadius = GAME_CONFIG.HOLE.INITIAL_RADIUS;
    this.targetRadius = GAME_CONFIG.HOLE.INITIAL_RADIUS;
    this.hole.setRadius(this.currentRadius);
    this.camera.radius = GAME_CONFIG.PROGRESSION.BASE_CAMERA_RADIUS;
  }

  public dispose(): void {
    if (this.renderObserver) {
      this.scene.onBeforeRenderObservable.remove(this.renderObserver);
      this.renderObserver = null;
    }
    if (this.triggerObserver) {
      this.ingestionTrigger.onEntitySwallowedObservable.remove(this.triggerObserver);
      this.triggerObserver = null;
    }
    this.onScoreChangedObservable.clear();
    this.onLevelUpObservable.clear();
    this.onEntitySwallowedObservable.clear();
  }
}
