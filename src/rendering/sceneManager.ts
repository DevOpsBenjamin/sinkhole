import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { Color4, Color3 } from '@babylonjs/core/Maths/math.color';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import { PhysicsMotionType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { PhysicsShapeBox, PhysicsShapeSphere } from '@babylonjs/core/Physics/v2/physicsShape';
import { GAME_CONFIG } from '../config/constants';

export class SceneManager {
  private scene: Scene;
  private camera!: ArcRotateCamera;
  private hemisphericLight!: HemisphericLight;
  private directionalLight!: DirectionalLight;
  private shadowGenerator!: ShadowGenerator;

  constructor(private engine: Engine) {
    this.scene = new Scene(this.engine);
    this.setupSceneEnvironment();
    this.setupCamera();
    this.setupLighting();
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
   * Creates initial scene validation geometry with Havok physics bodies.
   */
  public setupDemoArena(): void {
    // Ground / Arena
    const ground = MeshBuilder.CreateGround(
      'ground',
      { width: GAME_CONFIG.ARENA.SIZE, height: GAME_CONFIG.ARENA.SIZE },
      this.scene
    );
    const groundMaterial = new StandardMaterial('groundMat', this.scene);
    groundMaterial.diffuseColor = new Color3(0.25, 0.28, 0.35);
    groundMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
    ground.material = groundMaterial;
    ground.receiveShadows = true;

    // Ground static physics body
    const groundShape = new PhysicsShapeBox(
      Vector3.Zero(),
      Quaternion.Identity(),
      new Vector3(GAME_CONFIG.ARENA.SIZE, 0.2, GAME_CONFIG.ARENA.SIZE),
      this.scene
    );
    const groundBody = new PhysicsBody(ground, PhysicsMotionType.STATIC, false, this.scene);
    groundBody.shape = groundShape;
    groundBody.setMassProperties({ mass: 0 });

    // Sample dynamic props falling to validate Havok WASM simulation
    const propMat = new StandardMaterial('propMat', this.scene);
    propMat.diffuseColor = new Color3(0.9, 0.4, 0.2);

    for (let i = 0; i < 5; i++) {
      const sphere = MeshBuilder.CreateSphere(`testSphere_${i}`, { diameter: 1.2 }, this.scene);
      sphere.position = new Vector3((i - 2) * 2.5, 4 + i * 2, 0);
      sphere.material = propMat;
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
}
