import { Engine } from '@babylonjs/core/Engines/engine';
import { GAME_CONFIG } from './config/constants';
import { PhysicsManager } from './physics/physicsManager';
import { SceneManager } from './rendering/sceneManager';
import { Hole } from './entities/hole';
import { HoleController } from './controllers/holeController';
import { SwallowableEntity } from './entities/swallowableEntity';
import { IngestionTrigger } from './physics/ingestionTrigger';

export class GameApp {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private sceneManager: SceneManager;
  private physicsManager: PhysicsManager;
  private isInitialized = false;

  constructor(canvasId: string = GAME_CONFIG.CANVAS_ID) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) {
      throw new Error(`[GameApp] Canvas element with id "${canvasId}" not found in DOM.`);
    }
    this.canvas = canvas;

    // Initialize Babylon Engine with antialiasing and stencil buffer support (needed for hole stencil mask)
    this.engine = new Engine(this.canvas, true, {
      stencil: true,
      preserveDrawingBuffer: true,
      antialias: true,
      powerPreference: 'high-performance',
    });

    this.sceneManager = new SceneManager(this.engine);
    this.physicsManager = new PhysicsManager();
  }

  public async start(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('[GameApp] Starting SinkHole 3D Engine...');
    const scene = this.sceneManager.getScene();

    // Initialize Havok Physics WASM
    await this.physicsManager.initialize(scene);

    // Setup initial test arena with Stencil masking, Hole, Procedural Props and Ingestion Trigger
    this.sceneManager.setupDemoArena();

    // Setup resize listener
    window.addEventListener('resize', this.onResize);

    // Start render loop
    this.engine.runRenderLoop(() => {
      scene.render();
    });

    this.isInitialized = true;
    console.log('[GameApp] SinkHole 3D Engine started and running.');
  }

  private onResize = (): void => {
    this.engine.resize();
  };

  public getSceneManager(): SceneManager {
    return this.sceneManager;
  }

  public getPhysicsManager(): PhysicsManager {
    return this.physicsManager;
  }

  public getHole(): Hole | null {
    return this.sceneManager.getHole();
  }

  public getHoleController(): HoleController | null {
    return this.sceneManager.getHoleController();
  }

  public getIngestionTrigger(): IngestionTrigger | null {
    return this.sceneManager.getIngestionTrigger();
  }

  public getEntities(): SwallowableEntity[] {
    return this.sceneManager.getEntities();
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.sceneManager.getScene().dispose();
    this.engine.dispose();
    this.isInitialized = false;
  }
}
