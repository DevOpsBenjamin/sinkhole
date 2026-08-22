import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { Color4, Color3 } from '@babylonjs/core/Maths/math.color';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Constants } from '@babylonjs/core/Engines/constants';
import { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import { PhysicsMotionType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { PhysicsShapeBox, PhysicsShapeSphere } from '@babylonjs/core/Physics/v2/physicsShape';
import { GAME_CONFIG } from '../config/constants';
import { Hole } from '../entities/hole';

export class SceneManager {
  private scene: Scene;
  private camera!: ArcRotateCamera;
  private hemisphericLight!: HemisphericLight;
  private directionalLight!: DirectionalLight;
  private shadowGenerator!: ShadowGenerator;
  private groundMesh!: Mesh;
  private hole: Hole | null = null;

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
    this.scene.clearColor = new Color4(0.12, 0.12, 0.18, 1.0);
    this.scene.ambientColor = new Color3(0.3, 0.3, 0.35);
  }

  private setupCamera(): void {
    this.camera = new ArcRotateCamera(
      'mainCamera',
      GAME_CONFIG.CAMERA.ALPHA,
      GAME_CONFIG.CAMERA.BETA,
      GAME_CONFIG.CAMERA.RADIUS,
      GAME_CONFIG.CAMERA.TARGET,
      this.scene
    );

    this.camera.minZ = GAME_CONFIG.CAMERA.MIN_Z;
    this.camera.maxZ = GAME_CONFIG.CAMERA.MAX_Z;
    this.camera.lowerBetaLimit = GAME_CONFIG.CAMERA.LOWER_BETA_LIMIT;
    this.camera.upperBetaLimit = GAME_CONFIG.CAMERA.UPPER_BETA_LIMIT;

    const canvas = this.engine.getRenderingCanvas();
    if (canvas) {
      this.camera.attachControl(canvas, true);
    }
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
    this.directionalLight.position = new Vector3(20, 40, 20);
    this.directionalLight.intensity = GAME_CONFIG.LIGHTS.DIRECTIONAL_INTENSITY;

    // Shadow Generator
    this.shadowGenerator = new ShadowGenerator(2048, this.directionalLight);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurKernel = 32;
    this.shadowGenerator.darkness = 0.35;
  }

  /**
   * Crée l'arène de jeu avec le sol configuré en test Stencil et initialise le Trou.
   */
  public setupDemoArena(): void {
    // 1. Urban Arena Ground with Stencil test (only renders where stencil != 1)
    this.groundMesh = MeshBuilder.CreateGround(
      'arenaGround',
      { width: GAME_CONFIG.ARENA.SIZE, height: GAME_CONFIG.ARENA.SIZE, subdivisions: 4 },
      this.scene
    );

    const groundMaterial = new StandardMaterial('groundMat', this.scene);
    groundMaterial.diffuseColor = new Color3(0.25, 0.28, 0.35);
    groundMaterial.specularColor = new Color3(0.1, 0.1, 0.1);

    // Stencil configuration: Discard ground pixels where the hole mask wrote 1
    groundMaterial.stencil.enabled = true;
    groundMaterial.stencil.func = Constants.NOTEQUAL;
    groundMaterial.stencil.funcRef = GAME_CONFIG.RENDERING.STENCIL_REF_HOLE;
    groundMaterial.stencil.funcMask = 0xff;
    groundMaterial.stencil.opStencilDepthPass = Constants.KEEP;
    groundMaterial.stencil.mask = 0xff;

    this.groundMesh.material = groundMaterial;
    this.groundMesh.receiveShadows = true;
    this.groundMesh.renderingGroupId = GAME_CONFIG.RENDERING.STENCIL_GROUP_ID_WORLD;

    // Ground static physics body
    const groundShape = new PhysicsShapeBox(
      Vector3.Zero(),
      Quaternion.Identity(),
      new Vector3(GAME_CONFIG.ARENA.SIZE, 0.2, GAME_CONFIG.ARENA.SIZE),
      this.scene
    );
    const groundBody = new PhysicsBody(this.groundMesh, PhysicsMotionType.STATIC, false, this.scene);
    groundBody.shape = groundShape;
    groundBody.setMassProperties({ mass: 0 });

    // 2. Initialize the Hole entity (Mask in Group 0, Abyss/Rim in Group 1)
    this.hole = new Hole(this.scene, GAME_CONFIG.HOLE.INITIAL_RADIUS, GAME_CONFIG.HOLE.DEPTH);
    this.hole.setPosition(0, 0);

    // 3. Sample dynamic props to demonstrate Havok physics and the visual cutout hole
    const propMat = new StandardMaterial('propMat', this.scene);
    propMat.diffuseColor = new Color3(0.9, 0.4, 0.2);

    for (let i = 0; i < 6; i++) {
      const sphere = MeshBuilder.CreateSphere(`testSphere_${i}`, { diameter: 1.2 }, this.scene);
      sphere.position = new Vector3((i - 2.5) * 3, 3 + i * 1.5, (i % 2 === 0 ? 1 : -1) * 2);
      sphere.material = propMat;
      sphere.renderingGroupId = GAME_CONFIG.RENDERING.STENCIL_GROUP_ID_WORLD;
      this.shadowGenerator.addShadowCaster(sphere);

      const sphereShape = new PhysicsShapeSphere(Vector3.Zero(), 0.6, this.scene);
      const sphereBody = new PhysicsBody(sphere, PhysicsMotionType.DYNAMIC, false, this.scene);
      sphereBody.shape = sphereShape;
      sphereBody.setMassProperties({ mass: 1 });
    }
  }

  public getScene(): Scene {
    return this.scene;
  }

  public getCamera(): ArcRotateCamera {
    return this.camera;
  }

  public getShadowGenerator(): ShadowGenerator {
    return this.shadowGenerator;
  }

  public getHole(): Hole | null {
    return this.hole;
  }

  public getGround(): Mesh {
    return this.groundMesh;
  }
}
