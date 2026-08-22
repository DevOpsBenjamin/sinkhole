import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { Constants } from '@babylonjs/core/Engines/constants';
import { GAME_CONFIG } from '../config/constants';

/**
 * Entité Le Trou (The Hole / Sinkhole).
 * Gère le masque Stencil Buffer, l'Abîme intérieur avec texture de profondeur 3D,
 * la source de lumière interne illuminant les objets en chute, le fond et la bordure visuelle.
 */
export class Hole {
  private scene: Scene;
  private rootNode: TransformNode;
  private stencilMask: Mesh;
  private abyssMesh: Mesh;
  private abyssBottom: Mesh;
  private holeRim: Mesh;
  private innerLight: PointLight;
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

    // Root node to position and synchronize all hole components atomically
    this.rootNode = new TransformNode('holeRoot', this.scene);
    this.rootNode.position = new Vector3(0, 0, 0);

    // 1. Stencil Cutout Mask (Group 0 - Pure Stencil Write)
    this.stencilMask = this.createStencilMask();

    // 2. Abyss Interior Cylinder (Group 1 - 3D Depth Pit with gradient & rings)
    this.abyssMesh = this.createAbyssMesh();

    // 3. Abyss Bottom Cap (Group 1 - Vortex Void Illusion)
    this.abyssBottom = this.createAbyssBottom();

    // 4. Hole Rim Border (Group 1 - Stylized Beveled Outline)
    this.holeRim = this.createHoleRim();

    // 5. Internal Point Light illuminating falling props inside the tunnel
    this.innerLight = this.createInnerLight();

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
   * Crée le masque planaire qui écrit dans le Stencil Buffer sans écrire en couleur ni en profondeur.
   */
  private createStencilMask(): Mesh {
    const mask = MeshBuilder.CreateDisc(
      'stencilCutoutMask',
      {
        radius: 1, // Base unit radius, scaled via Transform
        tessellation: GAME_CONFIG.HOLE.TESSELLATION,
        sideOrientation: Mesh.DOUBLESIDE,
      },
      this.scene
    );

    // Rotate flat onto horizontal XZ plane
    mask.rotation.x = Math.PI / 2;
    mask.position.y = 0.002; // Positioned slightly above ground level
    mask.renderingGroupId = GAME_CONFIG.RENDERING.STENCIL_GROUP_ID_MASK;
    mask.parent = this.rootNode;
    mask.isPickable = false;

    // Stencil Material
    const maskMat = new StandardMaterial('stencilMaskMat', this.scene);
    maskMat.disableColorWrite = true;
    maskMat.disableDepthWrite = true;
    maskMat.stencil.enabled = true;
    maskMat.stencil.func = Constants.ALWAYS;
    maskMat.stencil.funcRef = GAME_CONFIG.RENDERING.STENCIL_REF_HOLE;
    maskMat.stencil.funcMask = 0xff;
    maskMat.stencil.opStencilDepthPass = Constants.REPLACE;
    maskMat.stencil.mask = 0xff;

    mask.material = maskMat;
    return mask;
  }

  /**
   * Crée le cylindre 3D de l'Abîme avec un dégradé vertical haute visibilité et des anneaux de repère 3D.
   */
  private createAbyssMesh(): Mesh {
    const cylinder = MeshBuilder.CreateCylinder(
      'abyssInterior',
      {
        diameterTop: 2,
        diameterBottom: 1.95,
        height: this.depth,
        tessellation: GAME_CONFIG.HOLE.TESSELLATION,
        sideOrientation: Mesh.DOUBLESIDE,
      },
      this.scene
    );

    cylinder.position.y = -this.depth / 2;
    cylinder.renderingGroupId = GAME_CONFIG.RENDERING.STENCIL_GROUP_ID_WORLD;
    cylinder.parent = this.rootNode;
    cylinder.isPickable = false;

    // Generate dynamic vertical gradient texture with highly visible depth rings and structural panels
    this.abyssTexture = new DynamicTexture(
      'abyssWallTexture',
      { width: 512, height: 512 },
      this.scene,
      false
    );
    const ctx = this.abyssTexture.getContext();

    // Vertical illumination gradient from illuminated top opening to deep abyss
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
   * Crée un anneau de bordure biseauté au ras du sol avec relief métallique/asphalte.
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
   * Met à jour la mise à l'échelle de toutes les composantes du trou.
   */
  private updateScaling(): void {
    const r = this.currentRadius;

    // Disc scaling (rotation X = PI/2 -> X and Y scale local plane)
    this.stencilMask.scaling.set(r, r, 1);
    this.abyssBottom.scaling.set(r * 0.96, r * 0.96, 1);

    // 3D cylinder & torus scaling (X, Z horizontal radii)
    this.abyssMesh.scaling.set(r, 1, r);
    this.holeRim.scaling.set(r, 1, r);
  }

  /**
   * Modifie la position du trou sur le plan horizontal (X, Z).
   */
  public setPosition(x: number, z: number): void {
    this.rootNode.position.x = x;
    this.rootNode.position.z = z;
  }

  /**
   * Renvoie la position actuelle du trou.
   */
  public getPosition(): Vector3 {
    return this.rootNode.position;
  }

  /**
   * Modifie le rayon du trou et met à jour l'ensemble des maillages.
   */
  public setRadius(radius: number): void {
    const clampedRadius = Math.max(
      GAME_CONFIG.HOLE.MIN_RADIUS,
      Math.min(radius, GAME_CONFIG.HOLE.MAX_RADIUS)
    );
    this.currentRadius = clampedRadius;
    this.updateScaling();
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
