import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { Constants } from '@babylonjs/core/Engines/constants';
import { PhysicsShapeContainer, PhysicsShapeBox } from '@babylonjs/core/Physics/v2/physicsShape';
import { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import { PhysicsMotionType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { COLLISION_MASKS, GAME_CONFIG } from '../config/constants';

/**
 * Entité Le Trou (The Hole / Sinkhole).
 * Gère le masque Stencil Buffer, le cylindre ouvert 3D (sans couvercle supérieur),
 * le fond de puits, la source lumineuse interne et le corps physique de tube (parois de collision).
 */
export class Hole {
  private scene: Scene;
  private rootNode: TransformNode;
  private stencilMask: Mesh;
  private abyssMesh: Mesh;
  private abyssBottom: Mesh;
  private holeRim: Mesh;
  private innerLight: PointLight;
  private tubeColliderMesh!: Mesh;
  private tubeColliderBody: PhysicsBody | null = null;
  private tubeShapeContainer: PhysicsShapeContainer | null = null;
  private abyssTexture: DynamicTexture | null = null;
  private bottomTexture: DynamicTexture | null = null;
  private currentRadius: number;
  private depth: number;

  constructor(
    scene: Scene,
    initialRadius: number = GAME_CONFIG.HOLE.INITIAL_RADIUS,
    depth: number = GAME_CONFIG.HOLE.DEPTH
  ) {
    this.scene = scene;
    this.currentRadius = initialRadius;
    this.depth = depth;

    // Root node to position and synchronize all hole visual components atomically
    this.rootNode = new TransformNode('holeRoot', this.scene);
    this.rootNode.position = new Vector3(0, 0, 0);

    // 1. Stencil Cutout Mask (Group 0 - Pure Stencil Write, no color, no depth)
    this.stencilMask = this.createStencilMask();

    // 2. Abyss Interior Cylinder: 100% open at the top (NO_CAP) for seamless deep view
    this.abyssMesh = this.createAbyssMesh();

    // 3. Abyss Bottom Cap (Group 1 - Vortex Void floor)
    this.abyssBottom = this.createAbyssBottom();

    // 4. Hole Rim Border (Group 1 - Stylized Beveled Outline)
    this.holeRim = this.createHoleRim();

    // 5. Internal Point Light illuminating falling props inside the tunnel
    this.innerLight = this.createInnerLight();

    // 6. Physical Havok Tube Wall Colliders so objects physically bounce inside the cylinder
    this.setupPhysicsTubeCollider();

    // Apply initial radius scaling
    this.updateScaling();
  }

  /**
   * Crée la source de lumière interne positionnée dans le tunnel du trou.
   * Illumine vivement les objets lorsqu'ils tombent sous la surface du sol.
   */
  private createInnerLight(): PointLight {
    const light = new PointLight('holeInnerLight', new Vector3(0, -3.0, 0), this.scene);
    light.parent = this.rootNode;
    light.intensity = 2.2;
    light.range = 35.0;
    light.diffuse = new Color3(0.65, 0.8, 1.0); // Lumière cyan/bleu clair vive
    light.specular = new Color3(0.9, 0.95, 1.0);
    return light;
  }

  /**
   * Crée la calotte sphérique qui écrit dans le Stencil Buffer en épousant la courbure de la planète.
   */
  private createStencilMask(): Mesh {
    const mask = new Mesh('stencilCutoutMask', this.scene);
    mask.renderingGroupId = GAME_CONFIG.RENDERING.STENCIL_GROUP_ID_MASK;
    mask.parent = this.rootNode;
    mask.isPickable = false;

    const maskMat = new StandardMaterial('stencilMaskMat', this.scene);
    maskMat.disableColorWrite = true;
    maskMat.disableDepthWrite = true;
    maskMat.stencil.enabled = true;
    maskMat.stencil.func = Constants.ALWAYS;
    maskMat.stencil.funcRef = GAME_CONFIG.RENDERING.STENCIL_REF_HOLE;
    maskMat.stencil.funcMask = 0xff;
    maskMat.stencil.opStencilDepthPass = Constants.REPLACE;
    maskMat.stencil.mask = 0xff;
    maskMat.backFaceCulling = false;

    mask.material = maskMat;
    this.updateStencilMaskGeometry(mask, this.currentRadius);
    return mask;
  }

  /**
   * Met à jour la géométrie de la calotte sphérique Stencil concentrique avec la planète (R=35m).
   */
  private updateStencilMaskGeometry(mesh: Mesh, radius: number): void {
    const planetR = GAME_CONFIG.PLANET.RADIUS;
    const rings = 8;
    const segments = GAME_CONFIG.HOLE.TESSELLATION;
    const epsilon = 0.03;

    const positions: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    const normals: number[] = [];

    // Center apex vertex
    positions.push(0, epsilon, 0);
    normals.push(0, 1, 0);
    uvs.push(0.5, 0.5);

    // Concentric rings matching spherical planet elevation
    for (let ring = 1; ring <= rings; ring++) {
      const frac = ring / rings;
      const rho = radius * frac;
      const y = Math.sqrt(Math.max(0, planetR * planetR - rho * rho)) - planetR + epsilon;

      for (let seg = 0; seg < segments; seg++) {
        const angle = (seg * 2 * Math.PI) / segments;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const x = rho * cos;
        const z = rho * sin;

        positions.push(x, y, z);
        const normY = (y + planetR) / planetR;
        normals.push(x / planetR, normY, z / planetR);
        uvs.push(0.5 + 0.5 * frac * cos, 0.5 + 0.5 * frac * sin);
      }
    }

    // Center fan
    for (let seg = 0; seg < segments; seg++) {
      const nextSeg = (seg + 1) % segments;
      indices.push(0, 1 + seg, 1 + nextSeg);
    }

    // Concentric quads
    for (let ring = 1; ring < rings; ring++) {
      const ringStart = 1 + (ring - 1) * segments;
      const nextRingStart = 1 + ring * segments;

      for (let seg = 0; seg < segments; seg++) {
        const nextSeg = (seg + 1) % segments;
        const p1 = ringStart + seg;
        const p2 = ringStart + nextSeg;
        const p3 = nextRingStart + seg;
        const p4 = nextRingStart + nextSeg;
        indices.push(p1, p3, p2);
        indices.push(p2, p3, p4);
      }
    }

    const vd = new VertexData();
    vd.positions = positions;
    vd.indices = indices;
    vd.normals = normals;
    vd.uvs = uvs;
    vd.applyToMesh(mesh, true);
  }

  /**
   * Crée l'Abîme conique 3D SANS AUCUN COUVERCLE SUPÉRIEUR (cap: NO_CAP)
   * convergeant radialement vers le centre de la planète (0,0,0).
   */
  private createAbyssMesh(): Mesh {
    const planetR = GAME_CONFIG.PLANET.RADIUS;
    const bottomRatio = Math.max(0.1, (planetR - this.depth) / planetR);

    const cylinder = MeshBuilder.CreateCylinder(
      'abyssInterior',
      {
        diameterTop: 2,
        diameterBottom: 2 * bottomRatio,
        height: this.depth,
        tessellation: GAME_CONFIG.HOLE.TESSELLATION,
        cap: Mesh.NO_CAP, // ABSOLUMENT AUCUN COUVERCLE : TUBE 100% OUVERT AU SOMMET ET AU FOND
        sideOrientation: Mesh.DOUBLESIDE,
      },
      this.scene
    );

    cylinder.position.y = -this.depth / 2;
    cylinder.renderingGroupId = GAME_CONFIG.RENDERING.STENCIL_GROUP_ID_WORLD;
    cylinder.parent = this.rootNode;
    cylinder.isPickable = false;

    // Dynamic vertical gradient texture with highly visible depth rings and structural panels
    this.abyssTexture = new DynamicTexture(
      'abyssWallTexture',
      { width: 512, height: 512 },
      this.scene,
      false
    );
    const ctx = this.abyssTexture.getContext();

    // Vertical illumination gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0.0, '#5a667f'); // Haut de paroi claire et bien visible sous l'ouverture
    gradient.addColorStop(0.12, '#3e485c'); // Paroi supérieure
    gradient.addColorStop(0.35, '#252c3c'); // Milieu supérieur
    gradient.addColorStop(0.65, '#121620'); // Profondeur sombre
    gradient.addColorStop(1.0, '#04060a'); // Bas du puits

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    // Highly visible horizontal depth ring markers with glowing cyan/white style
    for (let y = 30; y < 500; y += 45) {
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();

      // Intercalary grid dots
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      for (let x = 16; x < 512; x += 32) {
        ctx.fillRect(x - 2, y - 2, 4, 4);
      }
    }

    // Vertical wall structural pillars
    for (let x = 0; x < 512; x += 64) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }

    this.abyssTexture.update();

    const abyssMat = new StandardMaterial('abyssMat', this.scene);
    abyssMat.diffuseTexture = this.abyssTexture;
    abyssMat.emissiveTexture = this.abyssTexture;
    abyssMat.emissiveColor = new Color3(0.6, 0.6, 0.65);
    abyssMat.specularColor = new Color3(0.3, 0.3, 0.4);
    abyssMat.backFaceCulling = false;

    cylinder.material = abyssMat;
    return cylinder;
  }

  /**
   * Crée le fond de l'Abîme avec un vortex concentrique marquant le point de fuite.
   */
  private createAbyssBottom(): Mesh {
    const bottom = MeshBuilder.CreateDisc(
      'abyssBottom',
      {
        radius: 1,
        tessellation: GAME_CONFIG.HOLE.TESSELLATION,
        sideOrientation: Mesh.DOUBLESIDE,
      },
      this.scene
    );

    bottom.rotation.x = Math.PI / 2;
    bottom.position.y = -this.depth + 0.05;
    bottom.renderingGroupId = GAME_CONFIG.RENDERING.STENCIL_GROUP_ID_WORLD;
    bottom.parent = this.rootNode;
    bottom.isPickable = false;

    this.bottomTexture = new DynamicTexture('abyssBottomTexture', { width: 256, height: 256 }, this.scene, false);
    const ctx = this.bottomTexture.getContext();

    // Dark radial gradient
    const radial = ctx.createRadialGradient(128, 128, 5, 128, 128, 128);
    radial.addColorStop(0.0, '#101a30');
    radial.addColorStop(0.5, '#060a14');
    radial.addColorStop(1.0, '#020306');

    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, 256, 256);

    // Concentric rings
    ctx.strokeStyle = 'rgba(80, 160, 255, 0.25)';
    ctx.lineWidth = 2;
    for (let r = 20; r < 120; r += 25) {
      ctx.beginPath();
      ctx.arc(128, 128, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    this.bottomTexture.update();

    const bottomMat = new StandardMaterial('abyssBottomMat', this.scene);
    bottomMat.diffuseTexture = this.bottomTexture;
    bottomMat.emissiveTexture = this.bottomTexture;
    bottomMat.emissiveColor = new Color3(0.5, 0.5, 0.6);
    bottomMat.specularColor = new Color3(0, 0, 0);

    bottom.material = bottomMat;
    return bottom;
  }

  /**
   * Crée un anneau de bordure biseauté au ras de la surface sphérique.
   */
  private createHoleRim(): Mesh {
    const rim = MeshBuilder.CreateTorus(
      'holeRim',
      {
        diameter: 2.02,
        thickness: 0.10,
        tessellation: GAME_CONFIG.HOLE.TESSELLATION,
      },
      this.scene
    );

    rim.position.y = 0.018;
    rim.renderingGroupId = GAME_CONFIG.RENDERING.STENCIL_GROUP_ID_WORLD;
    rim.parent = this.rootNode;
    rim.isPickable = false;

    const rimMat = new StandardMaterial('holeRimMat', this.scene);
    rimMat.diffuseColor = new Color3(0.24, 0.28, 0.38);
    rimMat.emissiveColor = new Color3(0.08, 0.1, 0.15);
    rimMat.specularColor = new Color3(0.7, 0.75, 0.9);
    rimMat.specularPower = 48;
    rimMat.ambientColor = new Color3(0.15, 0.18, 0.25);

    rim.material = rimMat;
    return rim;
  }

  /**
   * Initialise le maillage et le corps physique de tube cylindrique Havok (12 colliders de parois).
   */
  private setupPhysicsTubeCollider(): void {
    this.tubeColliderMesh = new Mesh('holeTubeColliderMesh', this.scene);
    this.tubeColliderMesh.isVisible = false;
    this.tubeColliderMesh.isPickable = false;

    this.rebuildTubePhysicsShape();
  }

  /**
   * Construit la forme physique en tube creux conique avec 12 parois segmentées autour du périmètre.
   */
  private rebuildTubePhysicsShape(): void {
    if (this.tubeColliderBody) {
      this.tubeColliderBody.dispose();
      this.tubeColliderBody = null;
    }
    if (this.tubeShapeContainer) {
      this.tubeShapeContainer.dispose();
      this.tubeShapeContainer = null;
    }

    const container = new PhysicsShapeContainer(this.scene);
    const numSegments = 12;
    const r = this.currentRadius;
    const depth = this.depth;
    const planetR = GAME_CONFIG.PLANET.RADIUS;
    const rimY = Math.sqrt(Math.max(0, planetR * planetR - r * r)) - planetR;
    const bottomRatio = Math.max(0.1, (planetR - depth) / planetR);
    const rBottom = r * bottomRatio;
    const rMid = (r + rBottom) / 2;
    const segmentWidth = 2 * rMid * Math.tan(Math.PI / numSegments) * 1.08;
    const segmentThickness = 0.5;
    const taperAngle = Math.atan2(r - rBottom, depth);

    for (let i = 0; i < numSegments; i++) {
      const theta = (i * 2 * Math.PI) / numSegments;
      const x = Math.sin(theta) * (rMid + segmentThickness / 2);
      const z = Math.cos(theta) * (rMid + segmentThickness / 2);

      const rotAzimuth = Quaternion.RotationAxis(Vector3.Up(), theta);
      const rotTilt = Quaternion.RotationAxis(Vector3.Right(), taperAngle);
      const rot = rotAzimuth.multiply(rotTilt);

      const box = new PhysicsShapeBox(
        Vector3.Zero(),
        Quaternion.Identity(),
        new Vector3(segmentWidth, depth, segmentThickness),
        this.scene
      );
      container.addChild(box, new Vector3(x, rimY - depth / 2, z), rot, Vector3.One());
    }

    // Collision filter: WALL collides exclusively with SWALLOWED props falling inside the hole
    container.filterMembershipMask = COLLISION_MASKS.WALL;
    container.filterCollideMask = COLLISION_MASKS.SWALLOWED;

    this.tubeShapeContainer = container;
    this.tubeColliderBody = new PhysicsBody(
      this.tubeColliderMesh,
      PhysicsMotionType.ANIMATED,
      false,
      this.scene
    );
    this.tubeColliderBody.shape = container;
    this.tubeColliderBody.setMassProperties({ mass: 0 });

    const pos = this.rootNode.position;
    const quat = this.rootNode.rotationQuaternion ?? Quaternion.Identity();
    this.tubeColliderMesh.position.copyFrom(pos);
    this.tubeColliderMesh.rotationQuaternion = quat;
    this.tubeColliderBody.setTargetTransform(pos, quat);
  }

  /**
   * Met à jour la mise à l'échelle de toutes les composantes du trou.
   */
  private updateScaling(): void {
    const r = this.currentRadius;
    const planetR = GAME_CONFIG.PLANET.RADIUS;
    const rimY = Math.sqrt(Math.max(0, planetR * planetR - r * r)) - planetR;
    const bottomRatio = Math.max(0.1, (planetR - this.depth) / planetR);

    // 1. Mise à jour de la calotte sphérique Stencil concentrique
    this.updateStencilMaskGeometry(this.stencilMask, r);

    // 2. Position et mise à l'échelle de l'Abîme conique
    this.abyssMesh.position.y = rimY - this.depth / 2;
    this.abyssMesh.scaling.set(r, 1, r);

    // 3. Fond de l'Abîme au vortex
    this.abyssBottom.position.y = rimY - this.depth + 0.05;
    const bottomScale = r * bottomRatio * 0.98;
    this.abyssBottom.scaling.set(bottomScale, bottomScale, 1);

    // 4. Bordure de surface circulaire
    this.holeRim.position.y = rimY + 0.018;
    this.holeRim.scaling.set(r, 1, r);

    // 5. Source lumineuse interne
    this.innerLight.position.y = rimY - 3.0;

    // 6. Reconstruct physics conical tube collider to match new radius
    this.rebuildTubePhysicsShape();
  }

  /**
   * Modifie la position du trou sur la surface de la planète et oriente son axe selon la normale locale.
   */
  public setPosition(x: number, z: number, y?: number): void {
    const planetR = GAME_CONFIG.PLANET.RADIUS;
    const computedY = Math.sqrt(Math.max(0, planetR * planetR - x * x - z * z));
    const targetY = y !== undefined ? y : computedY;

    const pos = new Vector3(x, targetY, z);
    const len = pos.length();
    const normal = len > 0.001 ? pos.scale(1 / len) : Vector3.Up();

    const quat = new Quaternion();
    Quaternion.FromUnitVectorsToRef(Vector3.Up(), normal, quat);

    this.rootNode.position.copyFrom(pos);
    this.rootNode.rotationQuaternion = quat;

    if (this.tubeColliderMesh && this.tubeColliderBody) {
      this.tubeColliderMesh.position.copyFrom(pos);
      this.tubeColliderMesh.rotationQuaternion = quat;
      this.tubeColliderBody.setTargetTransform(pos, quat);
    }
  }

  /**
   * Renvoie la position actuelle du trou.
   */
  public getPosition(): Vector3 {
    return this.rootNode.position;
  }

  /**
   * Modifie le rayon du trou et met à jour l'ensemble des maillages et colliders physiques.
   */
  public setRadius(radius: number): void {
    const clampedRadius = Math.max(
      GAME_CONFIG.HOLE.MIN_RADIUS,
      Math.min(radius, GAME_CONFIG.HOLE.MAX_RADIUS)
    );
    if (Math.abs(this.currentRadius - clampedRadius) > 0.05) {
      this.currentRadius = clampedRadius;
      this.updateScaling();
    }
  }

  /**
   * Renvoie le rayon actuel du trou.
   */
  public getRadius(): number {
    return this.currentRadius;
  }

  /**
   * Renvoie la profondeur de l'Abîme.
   */
  public getDepth(): number {
    return this.depth;
  }

  /**
   * Renvoie le nœud racine de transformation.
   */
  public getRootNode(): TransformNode {
    return this.rootNode;
  }

  /**
   * Renvoie le maillage du masque Stencil.
   */
  public getStencilMask(): Mesh {
    return this.stencilMask;
  }

  /**
   * Renvoie le maillage de l'Abîme.
   */
  public getAbyssMesh(): Mesh {
    return this.abyssMesh;
  }

  /**
   * Libère les ressources allouées par le trou.
   */
  public dispose(): void {
    this.abyssTexture?.dispose();
    this.abyssTexture = null;

    this.bottomTexture?.dispose();
    this.bottomTexture = null;

    this.innerLight.dispose();

    if (this.tubeColliderBody) {
      this.tubeColliderBody.dispose();
      this.tubeColliderBody = null;
    }
    if (this.tubeShapeContainer) {
      this.tubeShapeContainer.dispose();
      this.tubeShapeContainer = null;
    }
    this.tubeColliderMesh?.dispose();

    this.stencilMask.material?.dispose();
    this.stencilMask.dispose();

    this.abyssMesh.material?.dispose();
    this.abyssMesh.dispose();

    this.abyssBottom.material?.dispose();
    this.abyssBottom.dispose();

    this.holeRim.material?.dispose();
    this.holeRim.dispose();

    this.rootNode.dispose();
  }
}
