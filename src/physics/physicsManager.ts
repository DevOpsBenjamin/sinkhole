import '@babylonjs/core/Physics/physicsEngineComponent';
import HavokPhysics from '@babylonjs/havok';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import { GAME_CONFIG } from '../config/constants';

export class PhysicsManager {
  private havokPlugin: HavokPlugin | null = null;
  private trackedBodies = new Set<PhysicsBody>();
  private radialGravityObserver: any = null;

  public async initialize(scene: Scene): Promise<HavokPlugin> {
    try {
      console.log('[PhysicsManager] Loading Havok Physics WASM...');
      const havokInstance = await HavokPhysics();
      this.havokPlugin = new HavokPlugin(true, havokInstance);
      scene.enablePhysics(GAME_CONFIG.PHYSICS.GRAVITY, this.havokPlugin);
      this.havokPlugin.setTimeStep(GAME_CONFIG.PHYSICS.TIME_STEP);
      this.setupRadialGravityLoop(scene);
      console.log('[PhysicsManager] Havok Physics with Radial Gravity initialized successfully.');
      return this.havokPlugin;
    } catch (error) {
      console.error('[PhysicsManager] Failed to initialize Havok Physics:', error);
      throw error;
    }
  }

  /**
   * Enregistre un corps rigide dynamique pour l'application du champ de gravité centripète.
   */
  public registerDynamicBody(body: PhysicsBody): void {
    this.trackedBodies.add(body);
  }

  /**
   * Retire un corps rigide du suivi de gravité.
   */
  public unregisterDynamicBody(body: PhysicsBody): void {
    this.trackedBodies.delete(body);
  }

  /**
   * Boucle d'application continue de la force de gravité radiale dirigée vers le centre (0,0,0).
   */
  private setupRadialGravityLoop(scene: Scene): void {
    this.radialGravityObserver = scene.onBeforeRenderObservable.add(() => {
      const g = GAME_CONFIG.PLANET.GRAVITY_ACCELERATION;

      for (const body of this.trackedBodies) {
        const node = body.transformNode;
        if (!node || node.isDisposed()) {
          this.trackedBodies.delete(body);
          continue;
        }

        const pos = node.getAbsolutePosition();
        const distSq = pos.x * pos.x + pos.y * pos.y + pos.z * pos.z;
        if (distSq < 0.001) continue;

        const dist = Math.sqrt(distSq);
        const dirX = -pos.x / dist;
        const dirY = -pos.y / dist;
        const dirZ = -pos.z / dist;

        const massProps = body.getMassProperties();
        const mass = massProps?.mass ?? 1.0;

        body.applyForce(
          new Vector3(dirX * g * mass, dirY * g * mass, dirZ * g * mass),
          pos
        );
      }
    });
  }

  public getPlugin(): HavokPlugin | null {
    return this.havokPlugin;
  }

  public dispose(): void {
    if (this.radialGravityObserver) {
      this.radialGravityObserver.remove();
      this.radialGravityObserver = null;
    }
    this.trackedBodies.clear();
  }
}
