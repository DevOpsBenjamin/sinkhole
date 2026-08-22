import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import { PhysicsMotionType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import {
  PhysicsShape,
  PhysicsShapeBox,
  PhysicsShapeCylinder,
  PhysicsShapeSphere,
} from '@babylonjs/core/Physics/v2/physicsShape';
import { COLLISION_MASKS, GAME_CONFIG } from '../config/constants';
import {
  PropDefinition,
  PropTier,
  PropType,
  SwallowableEntity,
} from '../entities/swallowableEntity';

/**
 * Fabrique procédurale d'Entités Avaleuses (Props).
 * Construit les maillages low-poly, les matériaux et les corps rigides Havok associés.
 */
export class PropFactory {
  private scene: Scene;
  private shadowGenerator: ShadowGenerator;
  private materialCache = new Map<string, StandardMaterial>();
  private idCounter = 0;

  constructor(scene: Scene, shadowGenerator: ShadowGenerator) {
    this.scene = scene;
    this.shadowGenerator = shadowGenerator;
  }

  private getOrCreateMaterial(name: string, diffuse: Color3, specular = new Color3(0.1, 0.1, 0.1)): StandardMaterial {
    if (this.materialCache.has(name)) {
      return this.materialCache.get(name)!;
    }
    const mat = new StandardMaterial(name, this.scene);
    mat.diffuseColor = diffuse;
    mat.specularColor = specular;
    this.materialCache.set(name, mat);
    return mat;
  }

  private setupEntity(id: string, mesh: Mesh, shape: PhysicsShape, def: PropDefinition): SwallowableEntity {
    mesh.renderingGroupId = GAME_CONFIG.RENDERING.STENCIL_GROUP_ID_WORLD;
    this.shadowGenerator.addShadowCaster(mesh);

    // Configure collision filter masks for Havok
    shape.filterMembershipMask = COLLISION_MASKS.PROP;
    shape.filterCollideMask = COLLISION_MASKS.GROUND | COLLISION_MASKS.PROP | COLLISION_MASKS.WALL;

    const body = new PhysicsBody(mesh, PhysicsMotionType.DYNAMIC, false, this.scene);
    body.shape = shape;
    body.setMassProperties({ mass: def.mass });

    return new SwallowableEntity(id, mesh, body, shape, def);
  }

  public createProp(type: PropType, position: Vector3, rotationY = 0): SwallowableEntity {
    const id = `prop_${type}_${++this.idCounter}`;

    switch (type) {
      // --- TIER 1 (MICRO) ---
      case PropType.TRAFFIC_CONE:
        return this.createTrafficCone(id, position, rotationY);
      case PropType.TRASH_BIN:
        return this.createTrashBin(id, position, rotationY);
      case PropType.WOODEN_CRATE:
        return this.createWoodenCrate(id, position, rotationY);
      case PropType.SMALL_BUSH:
        return this.createSmallBush(id, position, rotationY);

      // --- TIER 2 (MOYEN) ---
      case PropType.PARK_BENCH:
        return this.createParkBench(id, position, rotationY);
      case PropType.STREET_LAMP:
        return this.createStreetLamp(id, position, rotationY);
      case PropType.SEDAN_CAR:
        return this.createSedanCar(id, position, rotationY);
      case PropType.LARGE_TREE:
        return this.createLargeTree(id, position, rotationY);

      // --- TIER 3 (GRAND) ---
      case PropType.DELIVERY_TRUCK:
        return this.createDeliveryTruck(id, position, rotationY);
      case PropType.BUS_STOP:
        return this.createBusStop(id, position, rotationY);
      case PropType.HOUSE_PAVILION:
        return this.createHousePavilion(id, position, rotationY);

      default:
        return this.createWoodenCrate(id, position, rotationY);
    }
  }

  // -------------------------------------------------------------
  // TIER 1 BUILDERS
  // -------------------------------------------------------------

  private createTrafficCone(id: string, position: Vector3, rotationY: number): SwallowableEntity {
    const def: PropDefinition = {
      type: PropType.TRAFFIC_CONE,
      tier: PropTier.TIER_1,
      name: 'Cône de signalisation',
      points: 10,
      requiredHoleRadius: 0.8,
      mass: 1.5,
      dimensions: new Vector3(0.6, 0.8, 0.6),
    };

    const cone = MeshBuilder.CreateCylinder(
      `${id}_cone`,
      { diameterTop: 0.06, diameterBottom: 0.5, height: 0.75, tessellation: 16 },
      this.scene
    );
    const base = MeshBuilder.CreateBox(`${id}_base`, { width: 0.6, height: 0.06, depth: 0.6 }, this.scene);
    base.position.y = -0.35;

    const merged = Mesh.MergeMeshes([cone, base], true, true, undefined, false, true)!;
    merged.name = id;
    merged.position = position.clone();
    merged.position.y += 0.45;
    merged.rotation.y = rotationY;
    merged.material = this.getOrCreateMaterial('coneMat', new Color3(1.0, 0.42, 0.05), new Color3(0.3, 0.3, 0.3));

    const shape = new PhysicsShapeCylinder(
      new Vector3(0, -0.4, 0),
      new Vector3(0, 0.4, 0),
      0.3,
      this.scene
    );

    return this.setupEntity(id, merged, shape, def);
  }

  private createTrashBin(id: string, position: Vector3, rotationY: number): SwallowableEntity {
    const def: PropDefinition = {
      type: PropType.TRASH_BIN,
      tier: PropTier.TIER_1,
      name: 'Poubelle urbaine',
      points: 15,
      requiredHoleRadius: 0.9,
      mass: 2.5,
      dimensions: new Vector3(0.6, 0.9, 0.6),
    };

    const mesh = MeshBuilder.CreateCylinder(
      id,
      { diameter: 0.6, height: 0.9, tessellation: 18 },
      this.scene
    );
    mesh.position = position.clone();
    mesh.position.y += 0.5;
    mesh.rotation.y = rotationY;
    mesh.material = this.getOrCreateMaterial('trashMat', new Color3(0.12, 0.48, 0.28));

    const shape = new PhysicsShapeCylinder(
      new Vector3(0, -0.45, 0),
      new Vector3(0, 0.45, 0),
      0.3,
      this.scene
    );

    return this.setupEntity(id, mesh, shape, def);
  }

  private createWoodenCrate(id: string, position: Vector3, rotationY: number): SwallowableEntity {
    const def: PropDefinition = {
      type: PropType.WOODEN_CRATE,
      tier: PropTier.TIER_1,
      name: 'Caisse en bois',
      points: 20,
      requiredHoleRadius: 1.0,
      mass: 3.0,
      dimensions: new Vector3(0.8, 0.8, 0.8),
    };

    const mesh = MeshBuilder.CreateBox(id, { size: 0.8 }, this.scene);
    mesh.position = position.clone();
    mesh.position.y += 0.45;
    mesh.rotation.y = rotationY;
    mesh.material = this.getOrCreateMaterial('crateMat', new Color3(0.65, 0.45, 0.25));

    const shape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), new Vector3(0.8, 0.8, 0.8), this.scene);
    return this.setupEntity(id, mesh, shape, def);
  }

  private createSmallBush(id: string, position: Vector3, rotationY: number): SwallowableEntity {
    const def: PropDefinition = {
      type: PropType.SMALL_BUSH,
      tier: PropTier.TIER_1,
      name: 'Arbuste',
      points: 25,
      requiredHoleRadius: 1.1,
      mass: 3.5,
      dimensions: new Vector3(1.0, 0.9, 1.0),
    };

    const mesh = MeshBuilder.CreateSphere(id, { diameter: 1.0, segments: 8 }, this.scene);
    mesh.scaling.set(1.0, 0.85, 1.0);
    mesh.position = position.clone();
    mesh.position.y += 0.5;
    mesh.rotation.y = rotationY;
    mesh.material = this.getOrCreateMaterial('bushMat', new Color3(0.2, 0.65, 0.18));

    const shape = new PhysicsShapeSphere(Vector3.Zero(), 0.5, this.scene);
    return this.setupEntity(id, mesh, shape, def);
  }

  // -------------------------------------------------------------
  // TIER 2 BUILDERS
  // -------------------------------------------------------------

  private createParkBench(id: string, position: Vector3, rotationY: number): SwallowableEntity {
    const def: PropDefinition = {
      type: PropType.PARK_BENCH,
      tier: PropTier.TIER_2,
      name: 'Banc de parc',
      points: 60,
      requiredHoleRadius: 1.6,
      mass: 20,
      dimensions: new Vector3(1.8, 0.7, 0.7),
    };

    const seat = MeshBuilder.CreateBox(`${id}_seat`, { width: 1.8, height: 0.1, depth: 0.6 }, this.scene);
    const back = MeshBuilder.CreateBox(`${id}_back`, { width: 1.8, height: 0.5, depth: 0.08 }, this.scene);
    back.position = new Vector3(0, 0.3, -0.26);

    const merged = Mesh.MergeMeshes([seat, back], true, true, undefined, false, true)!;
    merged.name = id;
    merged.position = position.clone();
    merged.position.y += 0.4;
    merged.rotation.y = rotationY;
    merged.material = this.getOrCreateMaterial('benchMat', new Color3(0.55, 0.32, 0.18));

    const shape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), new Vector3(1.8, 0.7, 0.7), this.scene);
    return this.setupEntity(id, merged, shape, def);
  }

  private createStreetLamp(id: string, position: Vector3, rotationY: number): SwallowableEntity {
    const def: PropDefinition = {
      type: PropType.STREET_LAMP,
      tier: PropTier.TIER_2,
      name: 'Lampadaire',
      points: 80,
      requiredHoleRadius: 1.8,
      mass: 25,
      dimensions: new Vector3(0.5, 3.2, 0.5),
    };

    const pole = MeshBuilder.CreateCylinder(`${id}_pole`, { diameter: 0.12, height: 3.0 }, this.scene);
    const top = MeshBuilder.CreateBox(`${id}_top`, { width: 0.5, height: 0.25, depth: 0.3 }, this.scene);
    top.position.y = 1.5;

    const merged = Mesh.MergeMeshes([pole, top], true, true, undefined, false, true)!;
    merged.name = id;
    merged.position = position.clone();
    merged.position.y += 1.65;
    merged.rotation.y = rotationY;
    merged.material = this.getOrCreateMaterial('lampMat', new Color3(0.18, 0.2, 0.25), new Color3(0.4, 0.4, 0.4));

    const shape = new PhysicsShapeCylinder(
      new Vector3(0, -1.6, 0),
      new Vector3(0, 1.6, 0),
      0.25,
      this.scene
    );

    return this.setupEntity(id, merged, shape, def);
  }

  private createSedanCar(id: string, position: Vector3, rotationY: number): SwallowableEntity {
    const def: PropDefinition = {
      type: PropType.SEDAN_CAR,
      tier: PropTier.TIER_2,
      name: 'Voiture citadine',
      points: 150,
      requiredHoleRadius: 2.2,
      mass: 45,
      dimensions: new Vector3(2.6, 1.2, 1.4),
    };

    const bodyMesh = MeshBuilder.CreateBox(`${id}_body`, { width: 2.6, height: 0.7, depth: 1.4 }, this.scene);
    const cabinMesh = MeshBuilder.CreateBox(`${id}_cabin`, { width: 1.5, height: 0.5, depth: 1.2 }, this.scene);
    cabinMesh.position = new Vector3(-0.2, 0.55, 0);

    const merged = Mesh.MergeMeshes([bodyMesh, cabinMesh], true, true, undefined, false, true)!;
    merged.name = id;
    merged.position = position.clone();
    merged.position.y += 0.65;
    merged.rotation.y = rotationY;

    // Pick a distinct car color
    const carColors = [
      new Color3(0.85, 0.15, 0.15), // Red
      new Color3(0.15, 0.45, 0.85), // Blue
      new Color3(0.95, 0.75, 0.1),  // Yellow
    ];
    const color = carColors[this.idCounter % carColors.length];
    merged.material = this.getOrCreateMaterial(`carMat_${this.idCounter % carColors.length}`, color, new Color3(0.4, 0.4, 0.4));

    const shape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), new Vector3(2.6, 1.2, 1.4), this.scene);
    return this.setupEntity(id, merged, shape, def);
  }

  private createLargeTree(id: string, position: Vector3, rotationY: number): SwallowableEntity {
    const def: PropDefinition = {
      type: PropType.LARGE_TREE,
      tier: PropTier.TIER_2,
      name: 'Grand arbre',
      points: 130,
      requiredHoleRadius: 2.4,
      mass: 40,
      dimensions: new Vector3(2.4, 3.6, 2.4),
    };

    const trunk = MeshBuilder.CreateCylinder(`${id}_trunk`, { diameter: 0.45, height: 1.6 }, this.scene);
    trunk.position.y = -1.0;

    const foliage = MeshBuilder.CreateSphere(`${id}_foliage`, { diameter: 2.2, segments: 10 }, this.scene);
    foliage.position.y = 0.6;

    const merged = Mesh.MergeMeshes([trunk, foliage], true, true, undefined, false, true)!;
    merged.name = id;
    merged.position = position.clone();
    merged.position.y += 1.85;
    merged.rotation.y = rotationY;
    merged.material = this.getOrCreateMaterial('treeMat', new Color3(0.14, 0.52, 0.22));

    const shape = new PhysicsShapeCylinder(
      new Vector3(0, -1.8, 0),
      new Vector3(0, 1.8, 0),
      1.1,
      this.scene
    );

    return this.setupEntity(id, merged, shape, def);
  }

  // -------------------------------------------------------------
  // TIER 3 BUILDERS
  // -------------------------------------------------------------

  private createDeliveryTruck(id: string, position: Vector3, rotationY: number): SwallowableEntity {
    const def: PropDefinition = {
      type: PropType.DELIVERY_TRUCK,
      tier: PropTier.TIER_3,
      name: 'Camion de livraison',
      points: 350,
      requiredHoleRadius: 3.2,
      mass: 150,
      dimensions: new Vector3(4.2, 2.0, 1.8),
    };

    const cabin = MeshBuilder.CreateBox(`${id}_cabin`, { width: 1.4, height: 1.4, depth: 1.8 }, this.scene);
    cabin.position = new Vector3(-1.3, -0.2, 0);

    const cargo = MeshBuilder.CreateBox(`${id}_cargo`, { width: 2.8, height: 1.9, depth: 1.8 }, this.scene);
    cargo.position = new Vector3(0.7, 0.05, 0);

    const merged = Mesh.MergeMeshes([cabin, cargo], true, true, undefined, false, true)!;
    merged.name = id;
    merged.position = position.clone();
    merged.position.y += 1.05;
    merged.rotation.y = rotationY;
    merged.material = this.getOrCreateMaterial('truckMat', new Color3(0.88, 0.9, 0.95), new Color3(0.3, 0.3, 0.3));

    const shape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), new Vector3(4.2, 2.0, 1.8), this.scene);
    return this.setupEntity(id, merged, shape, def);
  }

  private createBusStop(id: string, position: Vector3, rotationY: number): SwallowableEntity {
    const def: PropDefinition = {
      type: PropType.BUS_STOP,
      tier: PropTier.TIER_3,
      name: 'Abribus',
      points: 300,
      requiredHoleRadius: 3.0,
      mass: 120,
      dimensions: new Vector3(3.0, 2.2, 1.6),
    };

    const roof = MeshBuilder.CreateBox(`${id}_roof`, { width: 3.0, height: 0.12, depth: 1.6 }, this.scene);
    roof.position.y = 1.0;

    const backWall = MeshBuilder.CreateBox(`${id}_back`, { width: 2.9, height: 2.0, depth: 0.08 }, this.scene);
    backWall.position = new Vector3(0, -0.1, -0.75);

    const merged = Mesh.MergeMeshes([roof, backWall], true, true, undefined, false, true)!;
    merged.name = id;
    merged.position = position.clone();
    merged.position.y += 1.15;
    merged.rotation.y = rotationY;
    merged.material = this.getOrCreateMaterial('busStopMat', new Color3(0.2, 0.58, 0.68));

    const shape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), new Vector3(3.0, 2.2, 1.6), this.scene);
    return this.setupEntity(id, merged, shape, def);
  }

  private createHousePavilion(id: string, position: Vector3, rotationY: number): SwallowableEntity {
    const def: PropDefinition = {
      type: PropType.HOUSE_PAVILION,
      tier: PropTier.TIER_3,
      name: 'Pavillon résidentiel',
      points: 650,
      requiredHoleRadius: 4.2,
      mass: 300,
      dimensions: new Vector3(4.5, 3.6, 4.0),
    };

    const base = MeshBuilder.CreateBox(`${id}_houseBase`, { width: 4.5, height: 2.6, depth: 4.0 }, this.scene);
    base.position.y = -0.5;

    const roof = MeshBuilder.CreateCylinder(`${id}_roof`, { diameter: 4.8, height: 4.2, tessellation: 3 }, this.scene);
    roof.rotation.z = Math.PI / 2;
    roof.rotation.y = Math.PI / 2;
    roof.position.y = 1.4;

    const merged = Mesh.MergeMeshes([base, roof], true, true, undefined, false, true)!;
    merged.name = id;
    merged.position = position.clone();
    merged.position.y += 1.85;
    merged.rotation.y = rotationY;
    merged.material = this.getOrCreateMaterial('houseMat', new Color3(0.78, 0.68, 0.58));

    const shape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), new Vector3(4.5, 3.6, 4.0), this.scene);
    return this.setupEntity(id, merged, shape, def);
  }
}
