import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { PointerEventTypes, PointerInfo } from '@babylonjs/core/Events/pointerEvents';
import { Nullable } from '@babylonjs/core/types';
import { Observer } from '@babylonjs/core/Misc/observable';
import { GAME_CONFIG } from '../config/constants';
import { Hole } from '../entities/hole';

/**
 * Contrôleur de déplacement unifié et hybride pour Le Trou (The Hole).
 * Gère simultanément les entrées Clavier, Souris et Écran Tactile avec accélération,
 * friction, délimitation de l'arène et suivi fluide de la caméra.
 */
export class HoleController {
  private scene: Scene;
  private camera: ArcRotateCamera;
  private hole: Hole;

  // Velocity state
  private vx = 0;
  private vz = 0;

  // Input states
  private keysPressed = new Set<string>();
  private isPointerActive = false;
  private pointerTarget: { x: number; z: number } | null = null;
  private isEnabled = true;

  // Observers and event listeners
  private renderObserver: Nullable<Observer<Scene>> = null;
  private pointerObserver: Nullable<Observer<PointerInfo>> = null;

  constructor(scene: Scene, camera: ArcRotateCamera, hole: Hole) {
    this.scene = scene;
    this.camera = camera;
    this.hole = hole;

    this.setupEventListeners();
    this.setupRenderLoop();
  }

  private setupEventListeners(): void {
    // 1. Keyboard Listeners (WASD, ZQSD, Arrow keys)
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    // 2. Pointer Listeners (Mouse drag / touch move)
    this.pointerObserver = this.scene.onPointerObservable.add((pointerInfo) => {
      if (!this.isEnabled) return;

      switch (pointerInfo.type) {
        case PointerEventTypes.POINTERDOWN:
          this.isPointerActive = true;
          this.updatePointerTarget();
          break;

        case PointerEventTypes.POINTERMOVE:
          if (this.isPointerActive || pointerInfo.event.buttons > 0) {
            this.isPointerActive = true;
            this.updatePointerTarget();
          }
          break;

        case PointerEventTypes.POINTERUP:
          this.isPointerActive = false;
          this.pointerTarget = null;
          break;
      }
    });
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.isEnabled) return;
    this.keysPressed.add(event.code);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keysPressed.delete(event.code);
  };

  /**
   * Calcule le point d'impact du curseur/toucher sur la surface sphérique de la planète.
   */
  private updatePointerTarget(): void {
    const ray = this.scene.createPickingRay(
      this.scene.pointerX,
      this.scene.pointerY,
      null,
      this.camera
    );

    if (ray) {
      const hit = this.scene.pickWithRay(ray, (mesh) => mesh.name === 'planetMesh');
      if (hit && hit.hit && hit.pickedPoint) {
        this.pointerTarget = {
          x: hit.pickedPoint.x,
          z: hit.pickedPoint.z,
        };
      }
    }
  }

  /**
   * Enregistre la mise à jour de la physique de déplacement avant chaque frame de rendu.
   */
  private setupRenderLoop(): void {
    this.renderObserver = this.scene.onBeforeRenderObservable.add(() => {
      if (!this.isEnabled) return;

      const engine = this.scene.getEngine();
      const deltaTime = Math.min(engine.getDeltaTime() / 1000, 0.1); // Clamp to prevent spike issues

      this.updateMovement(deltaTime);
      this.updateCameraFollow(deltaTime);
    });
  }

  /**
   * Met à jour la vélocité et la position du Trou en combinant Clavier, Souris et Touch.
   */
  private updateMovement(deltaTime: number): void {
    let desiredVelX = 0;
    let desiredVelZ = 0;

    // 1. Check Keyboard Inputs
    let keyX = 0;
    let keyZ = 0;

    if (this.keysPressed.has('KeyW') || this.keysPressed.has('KeyZ') || this.keysPressed.has('ArrowUp')) {
      keyZ += 1;
    }
    if (this.keysPressed.has('KeyS') || this.keysPressed.has('ArrowDown')) {
      keyZ -= 1;
    }
    if (this.keysPressed.has('KeyA') || this.keysPressed.has('KeyQ') || this.keysPressed.has('ArrowLeft')) {
      keyX -= 1;
    }
    if (this.keysPressed.has('KeyD') || this.keysPressed.has('ArrowRight')) {
      keyX += 1;
    }

    const hasKeyboardInput = keyX !== 0 || keyZ !== 0;

    if (hasKeyboardInput) {
      const len = Math.hypot(keyX, keyZ);
      desiredVelX = (keyX / len) * GAME_CONFIG.CONTROLS.MAX_SPEED;
      desiredVelZ = (keyZ / len) * GAME_CONFIG.CONTROLS.MAX_SPEED;
    } else if (this.isPointerActive && this.pointerTarget) {
      // 2. Check Pointer / Touch Inputs
      const currentPos = this.hole.getPosition();
      const diffX = this.pointerTarget.x - currentPos.x;
      const diffZ = this.pointerTarget.z - currentPos.z;
      const distance = Math.hypot(diffX, diffZ);

      if (distance > GAME_CONFIG.CONTROLS.POINTER_DEADZONE) {
        const speedRatio = Math.min(
          1.0,
          (distance - GAME_CONFIG.CONTROLS.POINTER_DEADZONE) /
            (GAME_CONFIG.CONTROLS.POINTER_MAX_DISTANCE - GAME_CONFIG.CONTROLS.POINTER_DEADZONE)
        );
        const targetSpeed = speedRatio * GAME_CONFIG.CONTROLS.MAX_SPEED;
        desiredVelX = (diffX / distance) * targetSpeed;
        desiredVelZ = (diffZ / distance) * targetSpeed;
      }
    }

    // 3. Accelerate or Decelerate / Friction
    if (desiredVelX !== 0 || desiredVelZ !== 0) {
      const accelStep = GAME_CONFIG.CONTROLS.ACCELERATION * deltaTime;
      this.vx += (desiredVelX - this.vx) * Math.min(1.0, accelStep);
      this.vz += (desiredVelZ - this.vz) * Math.min(1.0, accelStep);
    } else {
      const frictionFactor = Math.max(0, 1.0 - GAME_CONFIG.CONTROLS.FRICTION * deltaTime);
      this.vx *= frictionFactor;
      this.vz *= frictionFactor;

      if (Math.abs(this.vx) < 0.01) this.vx = 0;
      if (Math.abs(this.vz) < 0.01) this.vz = 0;
    }

    // 4. Update Position along spherical surface
    const currentPos = this.hole.getPosition();
    const newX = currentPos.x + this.vx * deltaTime;
    const newZ = currentPos.z + this.vz * deltaTime;

    const planetR = GAME_CONFIG.PLANET.RADIUS;
    const maxRadius = planetR * 0.85; // Boundary for top-down polar region in current controller pass

    const distFromCenter = Math.hypot(newX, newZ);
    let clampedX = newX;
    let clampedZ = newZ;
    if (distFromCenter > maxRadius) {
      clampedX = (newX / distFromCenter) * maxRadius;
      clampedZ = (newZ / distFromCenter) * maxRadius;
    }

    this.hole.setPosition(clampedX, clampedZ);
  }

  /**
   * Assure un suivi de caméra souple et amorti centré sur le Trou en 3D.
   */
  private updateCameraFollow(deltaTime: number): void {
    const holePos = this.hole.getPosition();
    const target = this.camera.target;

    const lerpFactor = 1 - Math.exp(-GAME_CONFIG.CAMERA.FOLLOW_SMOOTHING * deltaTime);

    target.x += (holePos.x - target.x) * lerpFactor;
    target.y += (holePos.y - target.y) * lerpFactor;
    target.z += (holePos.z - target.z) * lerpFactor;
  }

  /**
   * Active ou désactive le contrôleur de déplacement.
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.vx = 0;
      this.vz = 0;
      this.keysPressed.clear();
      this.isPointerActive = false;
      this.pointerTarget = null;
    }
  }

  public getVelocity(): { x: number; z: number } {
    return { x: this.vx, z: this.vz };
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    if (this.pointerObserver) {
      this.scene.onPointerObservable.remove(this.pointerObserver);
      this.pointerObserver = null;
    }

    if (this.renderObserver) {
      this.scene.onBeforeRenderObservable.remove(this.renderObserver);
      this.renderObserver = null;
    }

    this.keysPressed.clear();
  }
}
