import { Vector3 } from '@babylonjs/core/Maths/math.vector';

export const COLLISION_MASKS = {
  GROUND: 1 << 0,     // 0x0001
  PROP: 1 << 1,       // 0x0002
  WALL: 1 << 2,       // 0x0004
  SWALLOWED: 1 << 3,  // 0x0008
} as const;

export const GAME_CONFIG = {
  CANVAS_ID: 'renderCanvas',
  TIMING: {
    ROUND_DURATION: 120, // 2 minutes in seconds
  },
  PHYSICS: {
    GRAVITY: Vector3.Zero(), // Gravité radiale dynamique Havok dirigée vers (0,0,0)
    GRAVITY_MAGNITUDE: 9.81,
    TIME_STEP: 1 / 60,
  },
  PLANET: {
    RADIUS: 35.0, // Rayon de la planète sphérique en mètres
    SEGMENTS: 64,
    GRAVITY_ACCELERATION: 9.81, // Accélération centripète dirigée vers (0,0,0)
  },
  INGESTION: {
    CENTRIPETAL_FORCE: 12.0, // Gentle natural horizontal centering
    DOWNWARD_EXTRA_GRAVITY: 1.0, // Pure standard Earth gravity (no artificial acceleration)
    REPULSION_FORCE: 15.0, // Outward deflection when prop is too big
    TRIGGER_RADIUS_MARGIN: 1.05, // Trigger coverage relative to hole radius
  },
  PROGRESSION: {
    LEVELS: [
      { level: 1, name: 'Micro Trou', requiredScore: 0, targetRadius: 1.5 },
      { level: 2, name: 'Moyen Trou', requiredScore: 120, targetRadius: 2.5 },
      { level: 3, name: 'Grand Trou', requiredScore: 500, targetRadius: 4.2 },
      { level: 4, name: 'Abîme Colossal', requiredScore: 1500, targetRadius: 6.0 },
    ],
    GROWTH_LERP_SPEED: 4.0,
    CAMERA_ZOOM_LERP_SPEED: 3.5,
    BASE_CAMERA_RADIUS: 25.0,
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
    DEPTH: 18.0, // Deep abyss pit for extended 3D falling duration
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
