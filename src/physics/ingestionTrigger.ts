import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Observable } from '@babylonjs/core/Misc/observable';
import { COLLISION_MASKS, GAME_CONFIG } from '../config/constants';
import { Hole } from '../entities/hole';
import { SwallowableEntity } from '../entities/swallowableEntity';

/**
 * Déclencheur volumétrique d'ingestion et gestionnaire de filtrage dynamique Havok.
 * Synchronisé en permanence avec la position et le rayon du Trou.
 */
export class IngestionTrigger {
  private scene: Scene;
  private hole: Hole;
  private getEntities: () => SwallowableEntity[];
  private isEnabled = true;

  public readonly onEntityFallingObservable = new Observable<SwallowableEntity>();
  public readonly onEntitySwallowedObservable = new Observable<SwallowableEntity>();

  private renderObserver: any = null;

  constructor(scene: Scene, hole: Hole, getEntities: () => SwallowableEntity[]) {
    this.scene = scene;
    this.hole = hole;
    this.getEntities = getEntities;

    this.registerSimulationLoop();
  }

  private registerSimulationLoop(): void {
    this.renderObserver = this.scene.onBeforeRenderObservable.add(() => {
      if (!this.isEnabled) return;
      const dt = this.scene.getEngine().getDeltaTime() / 1000.0;
      this.update(dt);
    });
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Invalide les paires de contact statiques en cache dans le moteur Havok WASM
   * lors du changement de masque de collision d'un corps.
   */
  private refreshBodyCollisions(body: any): void {
    const plugin = this.scene.getPhysicsEngine()?.getPhysicsPlugin() as any;
    if (plugin?._hknp && plugin?.world && body?._pluginData?.hpBodyId) {
      plugin._hknp.HP_World_RemoveBody(plugin.world, body._pluginData.hpBodyId);
      plugin._hknp.HP_World_AddBody(plugin.world, body._pluginData.hpBodyId, false);
    }
  }

  /**
   * Met à jour le filtrage de collision et applique les forces centripètes / gravitationnelles.
   */
  public update(_deltaTime: number): void {
    const holePos = this.hole.getPosition();
    const holeRadius = this.hole.getRadius();
    const triggerRadius = holeRadius * GAME_CONFIG.INGESTION.TRIGGER_RADIUS_MARGIN;
    const abyssBottomThreshold = -GAME_CONFIG.HOLE.DEPTH * 0.75;

    const entities = this.getEntities();

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (entity.isSwallowed || entity.mesh.isDisposed()) {
        continue;
      }

      const entityPos = entity.getPosition();
      const dx = entityPos.x - holePos.x;
      const dz = entityPos.z - holePos.z;
      const distHorizontal = Math.sqrt(dx * dx + dz * dz);

      // Check depth ingestion threshold (reached bottom of abyss)
      if (entityPos.y <= abyssBottomThreshold) {
        entity.isSwallowed = true;
        this.onEntitySwallowedObservable.notifyObservers(entity);
        continue;
      }

      // Check if entity is within the hole volume
      const isInsideHoleColumn = distHorizontal <= triggerRadius && entityPos.y >= -GAME_CONFIG.HOLE.DEPTH;

      if (isInsideHoleColumn) {
        const canSwallow = entity.canBeSwallowedBy(holeRadius);

        if (canSwallow) {
          // --- Case 1: Swallowable entity enters the hole ---
          if (!entity.isFallingInHole) {
            entity.isFallingInHole = true;

            // Remove GROUND collision mask so the entity drops freely through ground plane
            entity.shape.filterCollideMask = COLLISION_MASKS.PROP | COLLISION_MASKS.WALL | COLLISION_MASKS.SWALLOWED;
            entity.shape.filterMembershipMask = COLLISION_MASKS.SWALLOWED;

            // Purge Havok static broadphase contact cache
            this.refreshBodyCollisions(entity.body);

            // Give immediate downward plunge velocity and extra downward gravity
            const currentVel = entity.body.getLinearVelocity();
            entity.body.setLinearVelocity(new Vector3(currentVel.x * 0.5, -4.0, currentVel.z * 0.5));
            entity.body.setGravityFactor(GAME_CONFIG.INGESTION.DOWNWARD_EXTRA_GRAVITY);

            this.onEntityFallingObservable.notifyObservers(entity);
          }

          // Apply centripetal suction force towards hole center + downward pull into abyss
          const safeDist = Math.max(distHorizontal, 0.05);
          const dirX = -dx / safeDist;
          const dirZ = -dz / safeDist;

          const mass = entity.definition.mass;
          const suctionMagnitude = GAME_CONFIG.INGESTION.CENTRIPETAL_FORCE * mass;
          const downwardPull = -9.81 * mass * 1.5;
          const suctionForce = new Vector3(
            dirX * suctionMagnitude,
            downwardPull,
            dirZ * suctionMagnitude
          );

          entity.body.applyForce(suctionForce, entityPos);
        } else {
          // --- Case 2: Entity is too large for current hole radius ---
          // Ensure it keeps colliding with ground
          if (entity.isFallingInHole) {
            this.restoreGroundCollision(entity);
          }

          // Apply gentle outward deflection push if it rests atop the hole opening
          if (entityPos.y > -0.5) {
            const safeDist = Math.max(distHorizontal, 0.05);
            const pushDirX = dx / safeDist;
            const pushDirZ = dz / safeDist;

            const mass = entity.definition.mass;
            const repulsionMagnitude = GAME_CONFIG.INGESTION.REPULSION_FORCE * mass;
            const pushForce = new Vector3(
              pushDirX * repulsionMagnitude,
              0,
              pushDirZ * repulsionMagnitude
            );

            entity.body.applyForce(pushForce, entityPos);
          }
        }
      } else {
        // --- Case 3: Entity is outside the hole column ---
        if (entity.isFallingInHole && entityPos.y > -0.2 && distHorizontal > triggerRadius * 1.25) {
          this.restoreGroundCollision(entity);
        }
      }
    }
  }

  private restoreGroundCollision(entity: SwallowableEntity): void {
    entity.isFallingInHole = false;
    entity.shape.filterMembershipMask = COLLISION_MASKS.PROP;
    entity.shape.filterCollideMask = COLLISION_MASKS.GROUND | COLLISION_MASKS.PROP | COLLISION_MASKS.WALL;
    this.refreshBodyCollisions(entity.body);
    entity.body.setGravityFactor(1.0);
  }

  public dispose(): void {
    if (this.renderObserver) {
      this.scene.onBeforeRenderObservable.remove(this.renderObserver);
      this.renderObserver = null;
    }
    this.onEntityFallingObservable.clear();
    this.onEntitySwallowedObservable.clear();
  }
}
