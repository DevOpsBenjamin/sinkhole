import { Vector3 } from '@babylonjs/core/Maths/math.vector';

export const GAME_CONFIG = {
  CANVAS_ID: 'renderCanvas',
  PHYSICS: {
    GRAVITY: new Vector3(0, -9.81, 0),
    TIME_STEP: 1 / 60,
  },
  CAMERA: {
    ALPHA: -Math.PI / 2,
    BETA: Math.PI / 4, // 45 degrees top-down perspective
    RADIUS: 25,
    TARGET: Vector3.Zero(),
    LOWER_BETA_LIMIT: 0.1,
    UPPER_BETA_LIMIT: Math.PI / 2.2,
    MIN_Z: 0.1,
    MAX_Z: 1000,
    FOLLOW_SMOOTHING: 6.0,
  },
  LIGHTS: {
    HEMISPHERIC_INTENSITY: 0.6,
    DIRECTIONAL_INTENSITY: 0.8,
    DIRECTION: new Vector3(-1, -2, -1),
  },
  HOLE: {
    INITIAL_RADIUS: 1.5,
    MIN_RADIUS: 1.0,
    MAX_RADIUS: 12.0,
    DEPTH: 8.0,
    TESSELLATION: 64,
  },
  CONTROLS: {
    MAX_SPEED: 22.0, // Units per second
    ACCELERATION: 80.0,
    FRICTION: 8.0, // Damping / deceleration
    POINTER_DEADZONE: 0.3, // Min distance to move towards cursor
    POINTER_MAX_DISTANCE: 12.0, // Distance for max velocity
  },
  RENDERING: {
    STENCIL_GROUP_ID_MASK: 0,
    STENCIL_GROUP_ID_WORLD: 1,
    STENCIL_REF_HOLE: 1,
  },
  ARENA: {
    SIZE: 100,
  },
} as const;
