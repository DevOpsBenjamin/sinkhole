import HavokPhysics from '@babylonjs/havok';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import { Scene } from '@babylonjs/core/scene';
import { GAME_CONFIG } from '../config/constants';

export class PhysicsManager {
  private havokPlugin: HavokPlugin | null = null;

  public async initialize(scene: Scene): Promise<HavokPlugin> {
    try {
      console.log('[PhysicsManager] Loading Havok Physics WASM...');
      const havokInstance = await HavokPhysics();
      this.havokPlugin = new HavokPlugin(true, havokInstance);
      scene.enablePhysics(GAME_CONFIG.PHYSICS.GRAVITY, this.havokPlugin);
      this.havokPlugin.setTimeStep(GAME_CONFIG.PHYSICS.TIME_STEP);
      console.log('[PhysicsManager] Havok Physics initialized successfully.');
      return this.havokPlugin;
    } catch (error) {
      console.error('[PhysicsManager] Failed to initialize Havok Physics:', error);
      throw error;
    }
  }

  public getPlugin(): HavokPlugin | null {
    return this.havokPlugin;
  }
}
