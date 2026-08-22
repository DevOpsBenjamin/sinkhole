import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import '@babylonjs/core/Culling/ray';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color4, Color3 } from '@babylonjs/core/Maths/math.color';
import { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Constants } from '@babylonjs/core/Engines/constants';
import { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import { PhysicsMotionType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { PhysicsShapeSphere } from '@babylonjs/core/Physics/v2/physicsShape';
import { COLLISION_MASKS, GAME_CONFIG } from '../config/constants';
import { Hole } from '../entities/hole';
import { HoleController } from '../controllers/holeController';
import { PropFactory } from '../factories/propFactory';
import { ArenaSpawner } from '../spawning/arenaSpawner';
import { SwallowableEntity } from '../entities/swallowableEntity';
import { IngestionTrigger } from '../physics/ingestionTrigger';
import { GrowthManager } from '../gameplay/growthManager';
import { UIManager } from '../ui/uiManager';
import { GameManager } from '../gameplay/gameManager';
import { AudioManager } from '../audio/audioManager';

export class SceneManager {
  private scene: Scene;
  private camera!: TargetCamera;
  private hemisphericLight!: HemisphericLight;
  private directionalLight!: DirectionalLight;
  private shadowGenerator!: ShadowGenerator;
  private groundMesh!: Mesh;
  private hole: Hole | null = null;
  private holeController: HoleController | null = null;
  private propFactory: PropFactory | null = null;
  private arenaSpawner: ArenaSpawner | null = null;
  private ingestionTrigger: IngestionTrigger | null = null;
  private growthManager: GrowthManager | null = null;
  private uiManager: UIManager | null = null;
  private gameManager: GameManager | null = null;
  private audioManager: AudioManager | null = null;

  constructor(private engine: Engine) {
    this.scene = new Scene(this.engine);
    this.setupRenderingPipeline();
    this.setupSceneEnvironment();
    this.setupCamera();
    this.setupLighting();
  }

  /**
   * Configure les passes de rendu et la rétention du Stencil Buffer entre les groupes.
   */
  private setupRenderingPipeline(): void {
    // Enable stencil buffer on Babylon engine
    this.engine.setStencilBuffer(true);

    // Group 0 (Mask): Clears depth, color and stencil at frame start
    this.scene.setRenderingAutoClearDepthStencil(
      GAME_CONFIG.RENDERING.STENCIL_GROUP_ID_MASK,
      true,
      true,
      true
    );

    // Group 1 (World, Ground, Props, Abyss): Preserves Depth and Stencil written by Group 0
    this.scene.setRenderingAutoClearDepthStencil(
      GAME_CONFIG.RENDERING.STENCIL_GROUP_ID_WORLD,
      false,
      false,
      false
    );
  }

  private setupSceneEnvironment(): void {
    this.scene.clearColor = new Color4(0.08, 0.08, 0.14, 1.0);
    this.scene.ambientColor = new Color3(0.3, 0.3, 0.35);
  }

  private setupCamera(): void {
    const planetR = GAME_CONFIG.PLANET.RADIUS;
    const initialTarget = new Vector3(0, planetR, 0);
    const d = GAME_CONFIG.CAMERA.INITIAL_DISTANCE;
    const pitch = GAME_CONFIG.CAMERA.BASE_PITCH;
    const initialCamPos = new Vector3(0, planetR + d * Math.sin(pitch), -d * Math.cos(pitch));

    this.camera = new TargetCamera(
      'mainCamera',
      initialCamPos,
      this.scene
    );

    this.camera.setTarget(initialTarget);
    this.camera.upVector = new Vector3(0, 1, 0);
    this.camera.minZ = GAME_CONFIG.CAMERA.MIN_Z;
    this.camera.maxZ = GAME_CONFIG.CAMERA.MAX_Z;
    this.camera.fov = GAME_CONFIG.CAMERA.FOV;
  }

  private setupLighting(): void {
    // Hemispheric ambient light (sky/ground color tones)
    this.hemisphericLight = new HemisphericLight(
      'hemiLight',
      new Vector3(0, 1, 0),
      this.scene
    );
    this.hemisphericLight.intensity = GAME_CONFIG.LIGHTS.HEMISPHERIC_INTENSITY;
    this.hemisphericLight.diffuse = new Color3(1, 0.98, 0.95);
    this.hemisphericLight.groundColor = new Color3(0.2, 0.25, 0.3);

    // Directional sun light for sharp shadows and depth
    this.directionalLight = new DirectionalLight(
      'dirLight',
      GAME_CONFIG.LIGHTS.DIRECTION,
      this.scene
    );
    this.directionalLight.position = new Vector3(30, 60, 30);
    this.directionalLight.intensity = GAME_CONFIG.LIGHTS.DIRECTIONAL_INTENSITY;

    // Shadow Generator
    this.shadowGenerator = new ShadowGenerator(2048, this.directionalLight);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurKernel = 32;
    this.shadowGenerator.darkness = 0.35;
  }

  /**
   * Crée le Planétoïde sphérique, initialise le Trou, son contrôleur, les entités, le trigger d'ingestion, le gestionnaire de croissance, l'UI et la boucle de jeu.
   */
  public setupDemoArena(): void {
    const planetRadius = GAME_CONFIG.PLANET.RADIUS;

    // 1. Spherical Planetoid Mesh with Stencil test (only renders where stencil != 1)
    this.groundMesh = MeshBuilder.CreateSphere(
      'planetMesh',
      { diameter: 2 * planetRadius, segments: GAME_CONFIG.PLANET.SEGMENTS },
      this.scene
    );

    const groundMaterial = new StandardMaterial('planetMat', this.scene);
    groundMaterial.diffuseColor = new Color3(0.22, 0.26, 0.34);
    groundMaterial.specularColor = new Color3(0.12, 0.15, 0.2);
    groundMaterial.ambientColor = new Color3(0.1, 0.12, 0.18);

    // Stencil configuration: Discard planet pixels where the hole mask wrote 1
    groundMaterial.stencil.enabled = true;
    groundMaterial.stencil.func = Constants.NOTEQUAL;
    groundMaterial.stencil.funcRef = GAME_CONFIG.RENDERING.STENCIL_REF_HOLE;
    groundMaterial.stencil.funcMask = 0xff;
    groundMaterial.stencil.opStencilDepthPass = Constants.KEEP;
    groundMaterial.stencil.mask = 0xff;

    this.groundMesh.material = groundMaterial;
    this.groundMesh.receiveShadows = true;
    this.groundMesh.renderingGroupId = GAME_CONFIG.RENDERING.STENCIL_GROUP_ID_WORLD;

    // Planet static spherical Havok physics body
    const planetShape = new PhysicsShapeSphere(
      Vector3.Zero(),
      planetRadius,
      this.scene
    );
    planetShape.material = { friction: 0.7, restitution: 0.1 };
    planetShape.filterMembershipMask = COLLISION_MASKS.GROUND;
    planetShape.filterCollideMask = COLLISION_MASKS.PROP;

    const planetBody = new PhysicsBody(this.groundMesh, PhysicsMotionType.STATIC, false, this.scene);
    planetBody.shape = planetShape;
    planetBody.setMassProperties({ mass: 0 });

    // Continuous radial gravity loop applying centripetal force towards (0,0,0) on all interactive entities
    this.scene.onBeforeRenderObservable.add(() => {
      const g = GAME_CONFIG.PLANET.GRAVITY_ACCELERATION;
      const entities = this.getEntities();

      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        if (entity.isSwallowed || entity.mesh.isDisposed()) continue;
        const body = entity.body;
        if (!body) continue;

        const pos = entity.getPosition();
        const distSq = pos.x * pos.x + pos.y * pos.y + pos.z * pos.z;
        if (distSq < 0.001) continue;

        const dist = Math.sqrt(distSq);
        const dirX = -pos.x / dist;
        const dirY = -pos.y / dist;
        const dirZ = -pos.z / dist;

        const mass = entity.definition.mass;
        body.applyForce(
          new Vector3(dirX * g * mass, dirY * g * mass, dirZ * g * mass),
          pos
        );
      }
    });

    // 2. Initialize the Hole entity (Mask in Group 0, Abyss/Rim in Group 1)
    this.hole = new Hole(this.scene, GAME_CONFIG.HOLE.INITIAL_RADIUS, GAME_CONFIG.HOLE.DEPTH);
    this.hole.setPosition(0, 0);

    // 3. Initialize HoleController for hybrid movement and smooth camera follow
    this.holeController = new HoleController(this.scene, this.camera, this.hole);

    // 4. Initialize PropFactory and ArenaSpawner for procedural Swallowable Entities (Tiers 1 to 3)
    this.propFactory = new PropFactory(this.scene, this.shadowGenerator);
    this.arenaSpawner = new ArenaSpawner(this.scene);
    this.arenaSpawner.spawnArena(this.propFactory);

    // 5. Initialize IngestionTrigger for dynamic collision filtering and suction vortex
    this.ingestionTrigger = new IngestionTrigger(
      this.scene,
      this.hole,
      () => this.getEntities(),
      this.shadowGenerator
    );

    // 6. Initialize AudioManager for reactive procedural sound synthesis
    this.audioManager = new AudioManager();

    // 7. Initialize GrowthManager for progression, score and dynamic hole scaling
    this.growthManager = new GrowthManager(
      this.scene,
      this.hole,
      this.arenaSpawner,
      this.ingestionTrigger,
      this.propFactory,
      this.audioManager
    );

    // 8. Initialize UIManager for 2D Babylon GUI (Start Menu, Live HUD, Game Over)
    this.uiManager = new UIManager(this.scene);

    // 9. Initialize GameManager to orchestrate states, speedrun timer and replay loop
    this.gameManager = new GameManager(
      this.scene,
      this.hole,
      this.holeController,
      this.growthManager,
      this.uiManager,
      this.arenaSpawner,
      this.propFactory,
      this.ingestionTrigger!,
      this.audioManager
    );
  }

  public getScene(): Scene {
    return this.scene;
  }

  public getCamera(): TargetCamera {
    return this.camera;
  }

  public getShadowGenerator(): ShadowGenerator {
    return this.shadowGenerator;
  }

  public getHole(): Hole | null {
    return this.hole;
  }

  public getHoleController(): HoleController | null {
    return this.holeController;
  }

  public getPropFactory(): PropFactory | null {
    return this.propFactory;
  }

  public getArenaSpawner(): ArenaSpawner | null {
    return this.arenaSpawner;
  }

  public getIngestionTrigger(): IngestionTrigger | null {
    return this.ingestionTrigger;
  }

  public getGrowthManager(): GrowthManager | null {
    return this.growthManager;
  }

  public getUIManager(): UIManager | null {
    return this.uiManager;
  }

  public getGameManager(): GameManager | null {
    return this.gameManager;
  }

  public getAudioManager(): AudioManager | null {
    return this.audioManager;
  }

  public getEntities(): SwallowableEntity[] {
    return this.arenaSpawner?.getEntities() ?? [];
  }

  public getGround(): Mesh {
    return this.groundMesh;
  }
}
