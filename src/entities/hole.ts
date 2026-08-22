import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Constants } from '@babylonjs/core/Engines/constants';
import { GAME_CONFIG } from '../config/constants';

/**
 * Entité Le Trou (The Hole / Sinkhole).
 * Gère le masque Stencil Buffer, l'Abîme intérieur, le fond et la bordure visuelle.
 */
export class Hole {
  private scene: Scene;
  private rootNode: TransformNode;
  private stencilMask: Mesh;
  private abyssMesh: Mesh;
  private abyssBottom: Mesh;
  private holeRim: Mesh;
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

    // 2. Abyss Interior Cylinder (Group 1 - Dark Pit)
    this.abyssMesh = this.createAbyssMesh();

    // 3. Abyss Bottom Cap (Group 1 - Infinite Void Illusion)
    this.abyssBottom = this.createAbyssBottom();

    // 4. Hole Rim Border (Group 1 - Crisp Visual Outline)
    this.holeRim = this.createHoleRim();

    // Apply initial radius scaling
    this.updateScaling();
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
   * Crée le cylindre 3D de l'Abîme situé sous le sol de l'Arène.
   */
  private createAbyssMesh(): Mesh {
    const cylinder = MeshBuilder.CreateCylinder(
      'abyssInterior',
      {
        diameterTop: 2,
        diameterBottom: 1.9,
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

    // Abyss dark inner material
    const abyssMat = new StandardMaterial('abyssMat', this.scene);
    abyssMat.diffuseColor = new Color3(0.03, 0.03, 0.06);
    abyssMat.ambientColor = new Color3(0.01, 0.01, 0.02);
    abyssMat.specularColor = new Color3(0, 0, 0);
    abyssMat.backFaceCulling = false;

    cylinder.material = abyssMat;
    return cylinder;
  }

  /**
   * Crée le fond de l'Abîme simulant le gouffre sombre sans fin.
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

    const bottomMat = new StandardMaterial('abyssBottomMat', this.scene);
    bottomMat.diffuseColor = new Color3(0.005, 0.005, 0.01);
    bottomMat.ambientColor = new Color3(0.005, 0.005, 0.01);
    bottomMat.emissiveColor = new Color3(0.01, 0.008, 0.02);
    bottomMat.specularColor = new Color3(0, 0, 0);

    bottom.material = bottomMat;
    return bottom;
  }

  /**
   * Crée un anneau de bordure visuelle au ras du sol.
   */
  private createHoleRim(): Mesh {
    const rim = MeshBuilder.CreateTorus(
      'holeRim',
      {
        diameter: 2,
        thickness: 0.06,
        tessellation: GAME_CONFIG.HOLE.TESSELLATION,
      },
      this.scene
    );

    rim.position.y = 0.01;
    rim.renderingGroupId = GAME_CONFIG.RENDERING.STENCIL_GROUP_ID_WORLD;
    rim.parent = this.rootNode;
    rim.isPickable = false;

    const rimMat = new StandardMaterial('holeRimMat', this.scene);
    rimMat.diffuseColor = new Color3(0.12, 0.14, 0.2);
    rimMat.specularColor = new Color3(0.3, 0.3, 0.4);
    rimMat.ambientColor = new Color3(0.08, 0.08, 0.12);

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
    this.abyssBottom.scaling.set(r * 0.95, r * 0.95, 1);

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
