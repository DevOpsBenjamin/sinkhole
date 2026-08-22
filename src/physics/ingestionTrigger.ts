import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Observable } from '@babylonjs/core/Misc/observable';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { COLLISION_MASKS, GAME_CONFIG } from '../config/constants';
import { Hole } from '../entities/hole';
import { SwallowableEntity } from '../entities/swallowableEntity';

/**
 * Déclencheur volumétrique d'ingestion et gestionnaire de filtrage dynamique Havok.
 * Synchronisé en permanence avec la position et le rayon du Trou.
 * Gère la chute physique naturelle (gravité 1.0, sans accélération artificielle ni réduction d'échelle),
 * la suppression des ombres portées en sous-sol, et la disparition en fond de puits.
 */
export class IngestionTrigger {
  private scene: Scene;
  private hole: Hole;
  private getEntities: () => SwallowableEntity[];
  private shadowGenerator: ShadowGenerator | null = null;
  private isEnabled = true;

  public readonly onEntityFallingObservable = new Observable<SwallowableEntity>();
  public readonly onEntitySwallowedObservable = new Observable<SwallowableEntity>();

  private renderObserver: any = null;

  constructor(
    scene: Scene,
    hole: Hole,
    getEntities: () => SwallowableEntity[],
    shadowGenerator: ShadowGenerator | null = null
  ) {
    this.scene = scene;
    this.hole = hole;
    this.getEntities = getEntities;
    this.shadowGenerator = shadowGenerator;

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

  public setShadowGenerator(shadowGenerator: ShadowGenerator | null): void {
    this.shadowGenerator = shadowGenerator;
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
   * Met à jour le filtrage de collision et applique les forces centripètes / gravitationnelles naturelles.
   */
  public update(_deltaTime: number): void {
    const holePos = this.hole.getPosition();
    const holeRadius = this.hole.getRadius();
    const triggerRadius = holeRadius * GAME_CONFIG.INGESTION.TRIGGER_RADIUS_MARGIN;
    const planetR = GAME_CONFIG.PLANET.RADIUS;
    const abyssBottomThreshold = planetR - GAME_CONFIG.HOLE.DEPTH * 0.85;

    const entities = this.getEntities();

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (entity.isSwallowed || entity.mesh.isDisposed()) {
        continue;
      }

      const entityPos = entity.getPosition();
      const distFromCenter = Math.sqrt(entityPos.x * entityPos.x + entityPos.y * entityPos.y + entityPos.z * entityPos.z);

      // Check depth ingestion threshold (reached bottom of abyss -> disappear from cylinder)
      if (distFromCenter <= abyssBottomThreshold) {
        entity.isSwallowed = true;
        this.onEntitySwallowedObservable.notifyObservers(entity);
        continue;
      }

      const dx = entityPos.x - holePos.x;
      const dz = entityPos.z - holePos.z;
      const distHorizontal = Math.sqrt(dx * dx + dz * dz);

      // Check if entity is within the hole volume
      const isInsideHoleColumn = distHorizontal <= triggerRadius && distFromCenter <= planetR + 2.0;

      if (isInsideHoleColumn) {
        const canSwallow = entity.canBeSwallowedBy(holeRadius);

        if (canSwallow) {
          // --- Case 1: Swallowable entity enters the hole ---
          if (!entity.isFallingInHole) {
            entity.isFallingInHole = true;

            // Remove surface shadow casting so no phantom shadows are cast onto surface ground
            if (this.shadowGenerator) {
              this.shadowGenerator.removeShadowCaster(entity.mesh);
            }

            // Remove GROUND collision mask so the entity drops freely through ground plane
            entity.shape.filterCollideMask = COLLISION_MASKS.WALL | COLLISION_MASKS.PROP | COLLISION_MASKS.SWALLOWED;
            entity.shape.filterMembershipMask = COLLISION_MASKS.SWALLOWED;

            // Purge Havok static broadphase contact cache
            this.refreshBodyCollisions(entity.body);

            // Natural entry velocity with standard gravity (no extra downward acceleration)
            const currentVel = entity.body.getLinearVelocity();
            entity.body.setLinearVelocity(new Vector3(currentVel.x * 0.4, Math.min(currentVel.y, -0.2), currentVel.z * 0.4));
            entity.body.setGravityFactor(GAME_CONFIG.INGESTION.DOWNWARD_EXTRA_GRAVITY);

            // Apply 3D tumbling torque so prop spins and rolls naturally as it falls
            const mass = entity.definition.mass;
            const tumbleStrength = 2.0 * mass;
            entity.body.applyAngularImpulse(
              new Vector3(
                (Math.random() - 0.5) * tumbleStrength,
                (Math.random() - 0.5) * tumbleStrength * 0.5,
                (Math.random() - 0.5) * tumbleStrength
              )
            );

            this.onEntityFallingObservable.notifyObservers(entity);
          }

          // Gentle horizontal centripetal guidance towards hole center (no extra downward pull)
          const safeDist = Math.max(distHorizontal, 0.05);
          const dirX = -dx / safeDist;
          const dirZ = -dz / safeDist;

          const mass = entity.definition.mass;
          const suctionMagnitude = GAME_CONFIG.INGESTION.CENTRIPETAL_FORCE * mass;
          const suctionForce = new Vector3(
            dirX * suctionMagnitude,
            0, // Pure natural gravity handles the vertical fall!
            dirZ * suctionMagnitude
          );

          entity.body.applyForce(suctionForce, entityPos);

          // Physical containment inside cylinder
          const maxInnerR = holeRadius * 0.92;
          if (distHorizontal > maxInnerR && entityPos.y < -0.2) {
            const currentVel = entity.body.getLinearVelocity();
            const inwardX = -dx / distHorizontal;
            const inwardZ = -dz / distHorizontal;
            entity.body.setLinearVelocity(
              new Vector3(
                currentVel.x * 0.2 + inwardX * 1.5,
                currentVel.y,
                currentVel.z * 0.2 + inwardZ * 1.5
              )
            );
          }
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
    entity.mesh.scaling.set(1, 1, 1);
    entity.shape.filterMembershipMask = COLLISION_MASKS.PROP;
    entity.shape.filterCollideMask = COLLISION_MASKS.GROUND | COLLISION_MASKS.PROP | COLLISION_MASKS.WALL;
    this.refreshBodyCollisions(entity.body);
    entity.body.setGravityFactor(1.0);

    if (this.shadowGenerator) {
      this.shadowGenerator.addShadowCaster(entity.mesh);
    }
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
