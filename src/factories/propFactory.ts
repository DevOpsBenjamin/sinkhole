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

  private setupEntity(
    id: string,
    mesh: Mesh,
    shape: PhysicsShape,
    def: PropDefinition,
    worldPos: Vector3,
    orientation: Quaternion
  ): SwallowableEntity {
    mesh.renderingGroupId = GAME_CONFIG.RENDERING.STENCIL_GROUP_ID_WORLD;
    this.shadowGenerator.addShadowCaster(mesh);

    mesh.position = worldPos.clone();
    mesh.rotationQuaternion = orientation.clone();

    // Friction et restitution pour bonne tenue sur la courbure du globe
    shape.material = { friction: 0.7, restitution: 0.1 };

    // Configure collision filter masks for Havok
    shape.filterMembershipMask = COLLISION_MASKS.PROP;
    shape.filterCollideMask = COLLISION_MASKS.GROUND | COLLISION_MASKS.PROP | COLLISION_MASKS.WALL;

    const body = new PhysicsBody(mesh, PhysicsMotionType.DYNAMIC, false, this.scene);
    body.shape = shape;
    body.setMassProperties({ mass: def.mass });

    return new SwallowableEntity(id, mesh, body, shape, def);
  }

  /**
   * Crée une entité positionnée et orientée tangentiellement sur la surface sphérique de la planète.
   */
  public createPropOnSphere(
    type: PropType,
    surfacePos: Vector3,
    normal: Vector3,
    azimuthAngle = 0
  ): SwallowableEntity {
    const id = `prop_${type}_${++this.idCounter}`;

    // Base rotation alignant +Y local (Vector3.Up()) avec la normale de surface
    const baseQuat = new Quaternion();
    Quaternion.FromUnitVectorsToRef(Vector3.Up(), normal, baseQuat);
    const azimuthQuat = Quaternion.RotationAxis(normal, azimuthAngle);
    const orientation = azimuthQuat.multiply(baseQuat);

    const data = this.buildPropData(type, id);
    const worldPos = surfacePos.add(normal.scale(data.heightOffset));

    return this.setupEntity(id, data.mesh, data.shape, data.def, worldPos, orientation);
  }

  /**
   * Crée une entité avec coordonnées planes (rétro-compatibilité).
   */
  public createProp(type: PropType, position: Vector3, rotationY = 0): SwallowableEntity {
    return this.createPropOnSphere(type, position, Vector3.Up(), rotationY);
  }

  private buildPropData(type: PropType, id: string): { mesh: Mesh; shape: PhysicsShape; def: PropDefinition; heightOffset: number } {
    switch (type) {
      // --- TIER 1 (MICRO) ---
      case PropType.TRAFFIC_CONE:
        return this.buildTrafficCone(id);
      case PropType.TRASH_BIN:
        return this.buildTrashBin(id);
      case PropType.WOODEN_CRATE:
        return this.buildWoodenCrate(id);
      case PropType.SMALL_BUSH:
        return this.buildSmallBush(id);
      case PropType.SODA_CAN:
        return this.buildSodaCan(id);
      case PropType.FLOWER_POT:
        return this.buildFlowerPot(id);

      // --- TIER 2 (MOYEN) ---
      case PropType.PARK_BENCH:
        return this.buildParkBench(id);
      case PropType.STREET_LAMP:
        return this.buildStreetLamp(id);
      case PropType.SEDAN_CAR:
        return this.buildSedanCar(id);
      case PropType.LARGE_TREE:
        return this.buildLargeTree(id);

      // --- TIER 3 (GRAND) ---
      case PropType.DELIVERY_TRUCK:
        return this.buildDeliveryTruck(id);
      case PropType.BUS_STOP:
        return this.buildBusStop(id);
      case PropType.HOUSE_PAVILION:
        return this.buildHousePavilion(id);
      case PropType.CITY_BUS:
        return this.buildCityBus(id);

      // --- TIER 4 (MACRO) ---
      case PropType.APARTMENT_BUILDING:
        return this.buildApartmentBuilding(id);
      case PropType.OFFICE_BLOCK:
        return this.buildOfficeBlock(id);

      // --- TIER 5 (GIGA-MACRO) ---
      case PropType.SKYSCRAPER_TOWER:
        return this.buildSkyscraperTower(id);
      case PropType.COMMUNICATION_TOWER:
        return this.buildCommunicationTower(id);

      default:
        return this.buildWoodenCrate(id);
    }
  }

  // -------------------------------------------------------------
  // TIER 1 BUILDERS
  // -------------------------------------------------------------

  private buildTrafficCone(id: string): { mesh: Mesh; shape: PhysicsShape; def: PropDefinition; heightOffset: number } {
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
    merged.material = this.getOrCreateMaterial('coneMat', new Color3(1.0, 0.42, 0.05), new Color3(0.3, 0.3, 0.3));

    const shape = new PhysicsShapeCylinder(
      new Vector3(0, -0.4, 0),
      new Vector3(0, 0.4, 0),
      0.3,
      this.scene
    );

    return { mesh: merged, shape, def, heightOffset: 0.45 };
  }

  private buildTrashBin(id: string): { mesh: Mesh; shape: PhysicsShape; def: PropDefinition; heightOffset: number } {
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
    mesh.material = this.getOrCreateMaterial('trashMat', new Color3(0.12, 0.48, 0.28));

    const shape = new PhysicsShapeCylinder(
      new Vector3(0, -0.45, 0),
      new Vector3(0, 0.45, 0),
      0.3,
      this.scene
    );

    return { mesh, shape, def, heightOffset: 0.5 };
  }

  private buildWoodenCrate(id: string): { mesh: Mesh; shape: PhysicsShape; def: PropDefinition; heightOffset: number } {
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
    mesh.material = this.getOrCreateMaterial('crateMat', new Color3(0.65, 0.45, 0.25));

    const shape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), new Vector3(0.8, 0.8, 0.8), this.scene);
    return { mesh, shape, def, heightOffset: 0.45 };
  }

  private buildSmallBush(id: string): { mesh: Mesh; shape: PhysicsShape; def: PropDefinition; heightOffset: number } {
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
    mesh.material = this.getOrCreateMaterial('bushMat', new Color3(0.2, 0.65, 0.18));

    const shape = new PhysicsShapeSphere(Vector3.Zero(), 0.5, this.scene);
    return { mesh, shape, def, heightOffset: 0.5 };
  }

  // -------------------------------------------------------------
  // TIER 2 BUILDERS
  // -------------------------------------------------------------

  private buildParkBench(id: string): { mesh: Mesh; shape: PhysicsShape; def: PropDefinition; heightOffset: number } {
    const def: PropDefinition = {
      type: PropType.PARK_BENCH,
      tier: PropTier.TIER_2,
      name: 'Banc de parc',
      points: 60,
      requiredHoleRadius: 1.6,
      mass: 20,
      dimensions: new Vector3(1.8, 0.6, 0.7),
    };

    const seat = MeshBuilder.CreateBox(`${id}_seat`, { width: 1.8, height: 0.1, depth: 0.6 }, this.scene);
    seat.position.y = -0.15;
    const back = MeshBuilder.CreateBox(`${id}_back`, { width: 1.8, height: 0.4, depth: 0.08 }, this.scene);
    back.position = new Vector3(0, 0.1, -0.26);

    const merged = Mesh.MergeMeshes([seat, back], true, true, undefined, false, true)!;
    merged.name = id;
    merged.material = this.getOrCreateMaterial('benchMat', new Color3(0.55, 0.32, 0.18));

    const shape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), new Vector3(1.8, 0.6, 0.7), this.scene);
    return { mesh: merged, shape, def, heightOffset: 0.3 };
  }

  private buildStreetLamp(id: string): { mesh: Mesh; shape: PhysicsShape; def: PropDefinition; heightOffset: number } {
    const def: PropDefinition = {
      type: PropType.STREET_LAMP,
      tier: PropTier.TIER_2,
      name: 'Lampadaire',
      points: 80,
      requiredHoleRadius: 1.8,
      mass: 25,
      dimensions: new Vector3(0.5, 3.0, 0.5),
    };

    const pole = MeshBuilder.CreateCylinder(`${id}_pole`, { diameter: 0.12, height: 3.0 }, this.scene);
    const top = MeshBuilder.CreateBox(`${id}_top`, { width: 0.5, height: 0.25, depth: 0.3 }, this.scene);
    top.position.y = 1.4;

    const merged = Mesh.MergeMeshes([pole, top], true, true, undefined, false, true)!;
    merged.name = id;
    merged.material = this.getOrCreateMaterial('lampMat', new Color3(0.18, 0.2, 0.25), new Color3(0.4, 0.4, 0.4));

    const shape = new PhysicsShapeCylinder(
      new Vector3(0, -1.5, 0),
      new Vector3(0, 1.5, 0),
      0.25,
      this.scene
    );

    return { mesh: merged, shape, def, heightOffset: 1.5 };
  }

  private buildSedanCar(id: string): { mesh: Mesh; shape: PhysicsShape; def: PropDefinition; heightOffset: number } {
    const def: PropDefinition = {
      type: PropType.SEDAN_CAR,
      tier: PropTier.TIER_2,
      name: 'Voiture citadine',
      points: 150,
      requiredHoleRadius: 2.2,
      mass: 45,
      dimensions: new Vector3(2.6, 1.0, 1.4),
    };

    const bodyMesh = MeshBuilder.CreateBox(`${id}_body`, { width: 2.6, height: 0.6, depth: 1.4 }, this.scene);
    bodyMesh.position.y = -0.2;
    const cabinMesh = MeshBuilder.CreateBox(`${id}_cabin`, { width: 1.5, height: 0.4, depth: 1.2 }, this.scene);
    cabinMesh.position = new Vector3(-0.2, 0.3, 0);

    const merged = Mesh.MergeMeshes([bodyMesh, cabinMesh], true, true, undefined, false, true)!;
    merged.name = id;

    const carColors = [
      new Color3(0.85, 0.15, 0.15), // Rouge
      new Color3(0.15, 0.45, 0.85), // Bleu
      new Color3(0.95, 0.75, 0.1),  // Jaune
    ];
    const color = carColors[this.idCounter % carColors.length];
    merged.material = this.getOrCreateMaterial(`carMat_${this.idCounter % carColors.length}`, color, new Color3(0.4, 0.4, 0.4));

    const shape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), new Vector3(2.6, 1.0, 1.4), this.scene);
    return { mesh: merged, shape, def, heightOffset: 0.5 };
  }

  private buildLargeTree(id: string): { mesh: Mesh; shape: PhysicsShape; def: PropDefinition; heightOffset: number } {
    const def: PropDefinition = {
      type: PropType.LARGE_TREE,
      tier: PropTier.TIER_2,
      name: 'Grand arbre',
      points: 130,
      requiredHoleRadius: 2.4,
      mass: 40,
      dimensions: new Vector3(2.4, 3.4, 2.4),
    };

    const trunk = MeshBuilder.CreateCylinder(`${id}_trunk`, { diameter: 0.45, height: 1.6 }, this.scene);
    trunk.position.y = -0.9;

    const foliage = MeshBuilder.CreateSphere(`${id}_foliage`, { diameter: 2.2, segments: 10 }, this.scene);
    foliage.position.y = 0.6;

    const merged = Mesh.MergeMeshes([trunk, foliage], true, true, undefined, false, true)!;
    merged.name = id;
    merged.material = this.getOrCreateMaterial('treeMat', new Color3(0.14, 0.52, 0.22));

    const shape = new PhysicsShapeCylinder(
      new Vector3(0, -1.7, 0),
      new Vector3(0, 1.7, 0),
      1.1,
      this.scene
    );

    return { mesh: merged, shape, def, heightOffset: 1.7 };
  }

  // -------------------------------------------------------------
  // TIER 3 BUILDERS
  // -------------------------------------------------------------

  private buildDeliveryTruck(id: string): { mesh: Mesh; shape: PhysicsShape; def: PropDefinition; heightOffset: number } {
    const def: PropDefinition = {
      type: PropType.DELIVERY_TRUCK,
      tier: PropTier.TIER_3,
      name: 'Camion de livraison',
      points: 350,
      requiredHoleRadius: 3.2,
      mass: 150,
      dimensions: new Vector3(4.2, 1.6, 1.8),
    };

    const cabin = MeshBuilder.CreateBox(`${id}_cabin`, { width: 1.4, height: 1.2, depth: 1.8 }, this.scene);
    cabin.position = new Vector3(-1.3, -0.2, 0);

    const cargo = MeshBuilder.CreateBox(`${id}_cargo`, { width: 2.8, height: 1.6, depth: 1.8 }, this.scene);
    cargo.position = new Vector3(0.7, 0.0, 0);

    const merged = Mesh.MergeMeshes([cabin, cargo], true, true, undefined, false, true)!;
    merged.name = id;
    merged.material = this.getOrCreateMaterial('truckMat', new Color3(0.88, 0.9, 0.95), new Color3(0.3, 0.3, 0.3));

    const shape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), new Vector3(4.2, 1.6, 1.8), this.scene);
    return { mesh: merged, shape, def, heightOffset: 0.8 };
  }

  private buildBusStop(id: string): { mesh: Mesh; shape: PhysicsShape; def: PropDefinition; heightOffset: number } {
    const def: PropDefinition = {
      type: PropType.BUS_STOP,
      tier: PropTier.TIER_3,
      name: 'Abribus',
      points: 300,
      requiredHoleRadius: 3.0,
      mass: 120,
      dimensions: new Vector3(3.0, 2.0, 1.6),
    };

    const backWall = MeshBuilder.CreateBox(`${id}_back`, { width: 2.9, height: 2.0, depth: 0.08 }, this.scene);
    backWall.position = new Vector3(0, 0, -0.75);

    const roof = MeshBuilder.CreateBox(`${id}_roof`, { width: 3.0, height: 0.12, depth: 1.6 }, this.scene);
    roof.position.y = 1.0;

    const merged = Mesh.MergeMeshes([roof, backWall], true, true, undefined, false, true)!;
    merged.name = id;
    merged.material = this.getOrCreateMaterial('busStopMat', new Color3(0.2, 0.58, 0.68));

    const shape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), new Vector3(3.0, 2.0, 1.6), this.scene);
    return { mesh: merged, shape, def, heightOffset: 1.0 };
  }

  private buildHousePavilion(id: string): { mesh: Mesh; shape: PhysicsShape; def: PropDefinition; heightOffset: number } {
    const def: PropDefinition = {
      type: PropType.HOUSE_PAVILION,
      tier: PropTier.TIER_3,
      name: 'Pavillon résidentiel',
      points: 650,
      requiredHoleRadius: 4.2,
      mass: 300,
      dimensions: new Vector3(4.5, 3.6, 4.0),
    };

    const base = MeshBuilder.CreateBox(`${id}_houseBase`, { width: 4.5, height: 2.2, depth: 4.0 }, this.scene);
    base.position.y = -0.7;

    const roof = MeshBuilder.CreateCylinder(`${id}_roof`, { diameter: 4.0, height: 4.2, tessellation: 3 }, this.scene);
    roof.rotation.z = Math.PI / 2;
    roof.rotation.y = Math.PI / 2;
    roof.position.y = 1.1;

    const merged = Mesh.MergeMeshes([base, roof], true, true, undefined, false, true)!;
    merged.name = id;
    merged.material = this.getOrCreateMaterial('houseMat', new Color3(0.78, 0.68, 0.58));

    const shape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), new Vector3(4.5, 3.6, 4.0), this.scene);
    return { mesh: merged, shape, def, heightOffset: 1.8 };
  }

  private buildSodaCan(id: string): { mesh: Mesh; shape: PhysicsShape; def: PropDefinition; heightOffset: number } {
    const def: PropDefinition = {
      type: PropType.SODA_CAN,
      tier: PropTier.TIER_1,
      name: 'Canette de soda',
      points: 8,
      requiredHoleRadius: 0.8,
      mass: 0.5,
      dimensions: new Vector3(0.25, 0.38, 0.25),
    };

    const mesh = MeshBuilder.CreateCylinder(id, { diameter: 0.25, height: 0.38, tessellation: 12 }, this.scene);
    mesh.material = this.getOrCreateMaterial('sodaMat', new Color3(0.9, 0.12, 0.15), new Color3(0.5, 0.5, 0.5));

    const shape = new PhysicsShapeCylinder(
      new Vector3(0, -0.19, 0),
      new Vector3(0, 0.19, 0),
      0.125,
      this.scene
    );

    return { mesh, shape, def, heightOffset: 0.2 };
  }

  private buildFlowerPot(id: string): { mesh: Mesh; shape: PhysicsShape; def: PropDefinition; heightOffset: number } {
    const def: PropDefinition = {
      type: PropType.FLOWER_POT,
      tier: PropTier.TIER_1,
      name: 'Pot de fleurs',
      points: 12,
      requiredHoleRadius: 0.85,
      mass: 1.0,
      dimensions: new Vector3(0.45, 0.5, 0.45),
    };

    const pot = MeshBuilder.CreateCylinder(`${id}_pot`, { diameterTop: 0.45, diameterBottom: 0.3, height: 0.4, tessellation: 12 }, this.scene);
    const flower = MeshBuilder.CreateSphere(`${id}_flower`, { diameter: 0.35, segments: 6 }, this.scene);
    flower.position.y = 0.22;

    const merged = Mesh.MergeMeshes([pot, flower], true, true, undefined, false, true)!;
    merged.name = id;
    merged.material = this.getOrCreateMaterial('flowerMat', new Color3(0.85, 0.35, 0.18));

    const shape = new PhysicsShapeCylinder(
      new Vector3(0, -0.25, 0),
      new Vector3(0, 0.25, 0),
      0.225,
      this.scene
    );

    return { mesh: merged, shape, def, heightOffset: 0.25 };
  }

  private buildCityBus(id: string): { mesh: Mesh; shape: PhysicsShape; def: PropDefinition; heightOffset: number } {
    const def: PropDefinition = {
      type: PropType.CITY_BUS,
      tier: PropTier.TIER_3,
      name: 'Bus de ville',
      points: 450,
      requiredHoleRadius: 4.5,
      mass: 280,
      dimensions: new Vector3(6.2, 2.2, 2.0),
    };

    const bodyMesh = MeshBuilder.CreateBox(`${id}_busBody`, { width: 6.2, height: 1.8, depth: 2.0 }, this.scene);
    const roofStrip = MeshBuilder.CreateBox(`${id}_busRoof`, { width: 5.8, height: 0.4, depth: 1.9 }, this.scene);
    roofStrip.position.y = 1.0;

    const merged = Mesh.MergeMeshes([bodyMesh, roofStrip], true, true, undefined, false, true)!;
    merged.name = id;
    merged.material = this.getOrCreateMaterial('busMat', new Color3(0.12, 0.62, 0.85), new Color3(0.3, 0.3, 0.3));

    const shape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), new Vector3(6.2, 2.2, 2.0), this.scene);
    return { mesh: merged, shape, def, heightOffset: 1.1 };
  }

  // -------------------------------------------------------------
  // TIER 4 & 5 BUILDERS (MACRO & GIGA-MACRO)
  // -------------------------------------------------------------

  private buildApartmentBuilding(id: string): { mesh: Mesh; shape: PhysicsShape; def: PropDefinition; heightOffset: number } {
    const def: PropDefinition = {
      type: PropType.APARTMENT_BUILDING,
      tier: PropTier.TIER_4,
      name: "Immeuble d'habitation",
      points: 1200,
      requiredHoleRadius: 6.5,
      mass: 800,
      dimensions: new Vector3(5.5, 7.5, 5.0),
    };

    const mainBlock = MeshBuilder.CreateBox(`${id}_main`, { width: 5.5, height: 6.8, depth: 5.0 }, this.scene);
    const topLedge = MeshBuilder.CreateBox(`${id}_ledge`, { width: 3.2, height: 0.7, depth: 3.2 }, this.scene);
    topLedge.position.y = 3.6;

    const merged = Mesh.MergeMeshes([mainBlock, topLedge], true, true, undefined, false, true)!;
    merged.name = id;
    merged.material = this.getOrCreateMaterial('aptMat', new Color3(0.74, 0.65, 0.58), new Color3(0.1, 0.1, 0.1));

    const shape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), new Vector3(5.5, 7.5, 5.0), this.scene);
    return { mesh: merged, shape, def, heightOffset: 3.75 };
  }

  private buildOfficeBlock(id: string): { mesh: Mesh; shape: PhysicsShape; def: PropDefinition; heightOffset: number } {
    const def: PropDefinition = {
      type: PropType.OFFICE_BLOCK,
      tier: PropTier.TIER_4,
      name: 'Bloc de bureaux',
      points: 1800,
      requiredHoleRadius: 8.0,
      mass: 1400,
      dimensions: new Vector3(6.5, 9.5, 6.0),
    };

    const glassTower = MeshBuilder.CreateBox(`${id}_tower`, { width: 6.5, height: 9.0, depth: 6.0 }, this.scene);
    const crown = MeshBuilder.CreateBox(`${id}_crown`, { width: 6.8, height: 0.5, depth: 6.3 }, this.scene);
    crown.position.y = 4.6;

    const merged = Mesh.MergeMeshes([glassTower, crown], true, true, undefined, false, true)!;
    merged.name = id;
    merged.material = this.getOrCreateMaterial('officeMat', new Color3(0.22, 0.38, 0.58), new Color3(0.5, 0.5, 0.6));

    const shape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), new Vector3(6.5, 9.5, 6.0), this.scene);
    return { mesh: merged, shape, def, heightOffset: 4.75 };
  }

  private buildSkyscraperTower(id: string): { mesh: Mesh; shape: PhysicsShape; def: PropDefinition; heightOffset: number } {
    const def: PropDefinition = {
      type: PropType.SKYSCRAPER_TOWER,
      tier: PropTier.TIER_5,
      name: 'Gratte-ciel colossal',
      points: 4000,
      requiredHoleRadius: 12.0,
      mass: 3500,
      dimensions: new Vector3(7.5, 16.0, 7.5),
    };

    const lower = MeshBuilder.CreateBox(`${id}_lower`, { width: 7.5, height: 8.0, depth: 7.5 }, this.scene);
    lower.position.y = -4.0;
    const upper = MeshBuilder.CreateBox(`${id}_upper`, { width: 5.8, height: 6.0, depth: 5.8 }, this.scene);
    upper.position.y = 3.0;
    const spire = MeshBuilder.CreateCylinder(`${id}_spire`, { diameterBottom: 0.8, diameterTop: 0.1, height: 2.5, tessellation: 8 }, this.scene);
    spire.position.y = 7.0;

    const merged = Mesh.MergeMeshes([lower, upper, spire], true, true, undefined, false, true)!;
    merged.name = id;
    merged.material = this.getOrCreateMaterial('skyscraperMat', new Color3(0.18, 0.28, 0.42), new Color3(0.6, 0.6, 0.7));

    const shape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), new Vector3(7.5, 16.0, 7.5), this.scene);
    return { mesh: merged, shape, def, heightOffset: 8.0 };
  }

  private buildCommunicationTower(id: string): { mesh: Mesh; shape: PhysicsShape; def: PropDefinition; heightOffset: number } {
    const def: PropDefinition = {
      type: PropType.COMMUNICATION_TOWER,
      tier: PropTier.TIER_5,
      name: 'Tour de télécommunication',
      points: 5000,
      requiredHoleRadius: 14.0,
      mass: 2200,
      dimensions: new Vector3(4.5, 20.0, 4.5),
    };

    const mast = MeshBuilder.CreateCylinder(`${id}_mast`, { diameterBottom: 2.0, diameterTop: 0.5, height: 19.0, tessellation: 6 }, this.scene);
    const dish = MeshBuilder.CreateCylinder(`${id}_dish`, { diameter: 4.2, height: 0.4, tessellation: 12 }, this.scene);
    dish.rotation.z = Math.PI / 4;
    dish.position.y = 5.5;

    const merged = Mesh.MergeMeshes([mast, dish], true, true, undefined, false, true)!;
    merged.name = id;
    merged.material = this.getOrCreateMaterial('antennaMat', new Color3(0.85, 0.22, 0.22), new Color3(0.4, 0.4, 0.4));

    const shape = new PhysicsShapeCylinder(
      new Vector3(0, -10.0, 0),
      new Vector3(0, 10.0, 0),
      2.0,
      this.scene
    );

    return { mesh: merged, shape, def, heightOffset: 10.0 };
  }
}
