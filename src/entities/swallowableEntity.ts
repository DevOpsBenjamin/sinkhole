import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import { PhysicsShape } from '@babylonjs/core/Physics/v2/physicsShape';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

export enum PropTier {
  TIER_1 = 1, // Micro: cônes, poubelles, caisses, arbustes, canettes, pots de fleurs (r = 0.8 - 1.2m)
  TIER_2 = 2, // Moyen: bancs, lampadaires, voitures, grands arbres (r = 1.6 - 2.5m)
  TIER_3 = 3, // Grand: camions, abribus, pavillons, bus de ville (r = 3.0 - 4.5m)
  TIER_4 = 4, // Macro: immeubles d'habitation, blocs de bureaux (r = 6.0 - 9.0m)
  TIER_5 = 5, // Giga-Macro: gratte-ciels colossaux, tours de télécom (r = 12.0 - 18.0m)
}

export enum PropType {
  // Tier 1 - Micro
  TRAFFIC_CONE = 'TRAFFIC_CONE',
  TRASH_BIN = 'TRASH_BIN',
  WOODEN_CRATE = 'WOODEN_CRATE',
  SMALL_BUSH = 'SMALL_BUSH',
  SODA_CAN = 'SODA_CAN',
  FLOWER_POT = 'FLOWER_POT',

  // Tier 2 - Moyen
  PARK_BENCH = 'PARK_BENCH',
  STREET_LAMP = 'STREET_LAMP',
  SEDAN_CAR = 'SEDAN_CAR',
  LARGE_TREE = 'LARGE_TREE',

  // Tier 3 - Grand
  DELIVERY_TRUCK = 'DELIVERY_TRUCK',
  BUS_STOP = 'BUS_STOP',
  HOUSE_PAVILION = 'HOUSE_PAVILION',
  CITY_BUS = 'CITY_BUS',

  // Tier 4 - Macro
  APARTMENT_BUILDING = 'APARTMENT_BUILDING',
  OFFICE_BLOCK = 'OFFICE_BLOCK',

  // Tier 5 - Giga-Macro
  SKYSCRAPER_TOWER = 'SKYSCRAPER_TOWER',
  COMMUNICATION_TOWER = 'COMMUNICATION_TOWER',
}

export interface PropDefinition {
  type: PropType;
  tier: PropTier;
  name: string;
  points: number;
  requiredHoleRadius: number;
  mass: number;
  dimensions: Vector3;
}

/**
 * Entité Avaleuse (Swallowable Entity / Prop).
 * Représente un élément interactif du décor doté d'un maillage 3D, d'un corps physique Havok
 * et de propriétés de progression (Tier, points, rayon requis).
 */
export class SwallowableEntity {
  public readonly id: string;
  public readonly mesh: Mesh;
  public readonly body: PhysicsBody;
  public readonly shape: PhysicsShape;
  public readonly definition: PropDefinition;

  public isFallingInHole = false;
  public isSwallowed = false;

  constructor(
    id: string,
    mesh: Mesh,
    body: PhysicsBody,
    shape: PhysicsShape,
    definition: PropDefinition
  ) {
    this.id = id;
    this.mesh = mesh;
    this.body = body;
    this.shape = shape;
    this.definition = definition;
  }

  public getPosition(): Vector3 {
    return this.mesh.position;
  }

  public getTier(): PropTier {
    return this.definition.tier;
  }

  public getPoints(): number {
    return this.definition.points;
  }

  public getRequiredRadius(): number {
    return this.definition.requiredHoleRadius;
  }

  /**
   * Vérifie si le trou a atteint un rayon suffisant pour avaler cette entité.
   */
  public canBeSwallowedBy(holeRadius: number): boolean {
    return holeRadius >= this.definition.requiredHoleRadius;
  }

  /**
   * Applique une impulsion physique sur le corps rigide Havok.
   */
  public applyImpulse(impulse: Vector3, location?: Vector3): void {
    if (this.body) {
      this.body.applyImpulse(impulse, location ?? this.mesh.getAbsolutePosition());
    }
  }

  /**
   * Libère les ressources physiques Havok et le maillage Babylon.js.
   */
  public dispose(): void {
    this.shape.dispose();
    this.body.dispose();
    this.mesh.dispose();
  }
}
