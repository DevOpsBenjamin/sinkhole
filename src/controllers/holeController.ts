import { Scene } from '@babylonjs/core/scene';
import { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import { PointerEventTypes, PointerInfo } from '@babylonjs/core/Events/pointerEvents';
import { Nullable } from '@babylonjs/core/types';
import { Observer } from '@babylonjs/core/Misc/observable';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { GAME_CONFIG } from '../config/constants';
import { Hole } from '../entities/hole';

/**
 * Contrôleur de déplacement sphérique sur S² et Caméra Orbitale au Dézoom Révélateur.
 * Gère les déplacements par rotation sur Grand Cercle (géodésiques) sans singularité de pôles,
 * couplé à une caméra orbitale 6-DOF dont l'axe 'up' s'aligne dynamiquement sur la normale locale
 * et dont la distance/inclinaison s'élargit progressivement pour révéler la courbure planétaire.
 */
export class HoleController {
  private scene: Scene;
  private camera: TargetCamera;
  private hole: Hole;

  // Tangent Heading & Camera Basis
  private camHeading = new Vector3(0, 0, 1); // Vecteur tangent pointant vers l'avant de la caméra
  private smoothedHolePos = new Vector3(0, GAME_CONFIG.PLANET.RADIUS, 0);
  private smoothedCamPos: Vector3;
  private smoothedUpVector = new Vector3(0, 1, 0);

  // Velocity state in camera tangent space (vx = right, vz = forward)
  private vx = 0;
  private vz = 0;

  // Input states
  private keysPressed = new Set<string>();
  private isPointerActive = false;
  private pointerTarget: Vector3 | null = null;
  private isEnabled = true;

  // Observers and event listeners
  private renderObserver: Nullable<Observer<Scene>> = null;
  private pointerObserver: Nullable<Observer<PointerInfo>> = null;

  constructor(scene: Scene, camera: TargetCamera, hole: Hole) {
    this.scene = scene;
    this.camera = camera;
    this.hole = hole;

    const initialHolePos = this.hole.getPosition();
    this.smoothedHolePos = initialHolePos.clone();

    const d = GAME_CONFIG.CAMERA.INITIAL_DISTANCE;
    const pitch = GAME_CONFIG.CAMERA.BASE_PITCH;
    this.smoothedCamPos = new Vector3(
      initialHolePos.x,
      initialHolePos.y + d * Math.sin(pitch),
      initialHolePos.z - d * Math.cos(pitch)
    );

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
   * Calcule le point d'impact 3D du curseur/toucher sur la surface sphérique de la planète.
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
        this.pointerTarget = hit.pickedPoint.clone();
      }
    }
  }

  /**
   * Boucle de mise à jour avant chaque frame : physique tangentielle & caméra orbitale.
   */
  private setupRenderLoop(): void {
    this.renderObserver = this.scene.onBeforeRenderObservable.add(() => {
      if (!this.isEnabled) return;

      const engine = this.scene.getEngine();
      const deltaTime = Math.min(engine.getDeltaTime() / 1000, 0.1);

      this.updateMovement(deltaTime);
      this.updateCameraOrbit(deltaTime);
    });
  }

  /**
   * Met à jour la vitesse tangentielle et applique la rotation géodésique sur la sphère S².
   */
  private updateMovement(deltaTime: number): void {
    const currentPos = this.hole.getPosition();
    const planetR = GAME_CONFIG.PLANET.RADIUS;
    const normal = currentPos.length() > 0.001 ? currentPos.clone().normalize() : Vector3.Up();

    // 1. Calcul du repère tangent caméra en la position actuelle du trou
    // uForward : composante de camHeading tangente à la sphère
    let uForward = this.camHeading.subtract(normal.scale(Vector3.Dot(this.camHeading, normal)));
    if (uForward.lengthSquared() < 0.0001) {
      uForward = Math.abs(normal.y) < 0.99 ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);
      uForward = uForward.subtract(normal.scale(Vector3.Dot(uForward, normal)));
    }
    uForward.normalize();
    const uRight = Vector3.Cross(uForward, normal).normalize();

    // 2. Détermination de la consigne de vitesse (Keyboard / Pointer)
    let desiredVelRight = 0;
    let desiredVelForward = 0;

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
      desiredVelRight = (keyX / len) * GAME_CONFIG.CONTROLS.MAX_SPEED;
      desiredVelForward = (keyZ / len) * GAME_CONFIG.CONTROLS.MAX_SPEED;
    } else if (this.isPointerActive && this.pointerTarget) {
      const diff = this.pointerTarget.subtract(currentPos);
      const tangentDiff = diff.subtract(normal.scale(Vector3.Dot(diff, normal)));
      const dist = tangentDiff.length();

      if (dist > GAME_CONFIG.CONTROLS.POINTER_DEADZONE) {
        const speedRatio = Math.min(
          1.0,
          (dist - GAME_CONFIG.CONTROLS.POINTER_DEADZONE) /
            (GAME_CONFIG.CONTROLS.POINTER_MAX_DISTANCE - GAME_CONFIG.CONTROLS.POINTER_DEADZONE)
        );
        const targetSpeed = speedRatio * GAME_CONFIG.CONTROLS.MAX_SPEED;
        desiredVelRight = (Vector3.Dot(tangentDiff, uRight) / dist) * targetSpeed;
        desiredVelForward = (Vector3.Dot(tangentDiff, uForward) / dist) * targetSpeed;
      }
    }

    // 3. Accélération et Friction
    if (desiredVelRight !== 0 || desiredVelForward !== 0) {
      const accelStep = GAME_CONFIG.CONTROLS.ACCELERATION * deltaTime;
      this.vx += (desiredVelRight - this.vx) * Math.min(1.0, accelStep);
      this.vz += (desiredVelForward - this.vz) * Math.min(1.0, accelStep);
    } else {
      const frictionFactor = Math.max(0, 1.0 - GAME_CONFIG.CONTROLS.FRICTION * deltaTime);
      this.vx *= frictionFactor;
      this.vz *= frictionFactor;

      if (Math.abs(this.vx) < 0.01) this.vx = 0;
      if (Math.abs(this.vz) < 0.01) this.vz = 0;
    }

    // 4. Déplacement par rotation sur Grand Cercle (Geodesic Step)
    const deltaTangent = uRight.scale(this.vx * deltaTime).add(uForward.scale(this.vz * deltaTime));
    const deltaS = deltaTangent.length();

    if (deltaS > 0.0001) {
      const uMove = deltaTangent.scale(1 / deltaS);
      const dTheta = deltaS / planetR;
      const rotationAxis = Vector3.Cross(normal, uMove).normalize();
      const stepQuat = Quaternion.RotationAxis(rotationAxis, dTheta);

      const newPos = currentPos.clone();
      newPos.rotateByQuaternionToRef(stepQuat, newPos);
      newPos.normalize().scaleInPlace(planetR);

      // Met à jour la position 3D du Trou
      this.hole.setPosition(newPos.x, newPos.z, newPos.y);

      // Transporte parallèlement le vecteur camHeading
      this.camHeading.rotateByQuaternionToRef(stepQuat, this.camHeading);
      const newNormal = newPos.clone().normalize();
      this.camHeading.subtractInPlace(newNormal.scale(Vector3.Dot(this.camHeading, newNormal))).normalize();
    }
  }

  /**
   * Calcule la distance de recul de caméra Katamari selon le rayon du Trou.
   */
  private getTargetCameraDistance(holeRadius: number): number {
    const baseDist = GAME_CONFIG.CAMERA.INITIAL_DISTANCE;
    const extra = Math.pow(Math.max(0, holeRadius - 0.8), 0.82) * 5.8;
    return baseDist + extra;
  }

  /**
   * Calcule l'angle de plongée (pitch) selon le rayon du Trou (vue rasante au début -> spatiale ensuite).
   */
  private getTargetCameraPitch(holeRadius: number): number {
    const minPitch = GAME_CONFIG.CAMERA.BASE_PITCH;
    const maxPitch = GAME_CONFIG.CAMERA.MAX_PITCH;
    const t = Math.min(1.0, Math.max(0, (holeRadius - 0.8) / 18.0));
    return minPitch + (maxPitch - minPitch) * Math.sqrt(t);
  }

  /**
   * Caméra Orbitale au Dézoom Révélateur : suit le Trou n'importe où sur le globe 3D.
   */
  private updateCameraOrbit(deltaTime: number): void {
    const holePos = this.hole.getPosition();
    const holeRadius = this.hole.getRadius();

    // 1. Amortissement fluide de la position cible du Trou
    const followFactor = 1 - Math.exp(-GAME_CONFIG.CAMERA.FOLLOW_SMOOTHING * deltaTime);
    this.smoothedHolePos = Vector3.Lerp(this.smoothedHolePos, holePos, followFactor);

    const normal = this.smoothedHolePos.length() > 0.001 ? this.smoothedHolePos.clone().normalize() : Vector3.Up();

    // 2. Ré-orthogonalisation de l'orientation de caméra
    const uForward = this.camHeading.subtract(normal.scale(Vector3.Dot(this.camHeading, normal))).normalize();

    // 3. Calcul de la distance et inclinaison Katamari
    const dist = this.getTargetCameraDistance(holeRadius);
    const pitch = this.getTargetCameraPitch(holeRadius);

    // 4. Position désirée de la caméra dans l'espace orbital
    const desiredCamPos = this.smoothedHolePos
      .add(normal.scale(dist * Math.sin(pitch)))
      .subtract(uForward.scale(dist * Math.cos(pitch)));

    const camLerp = 1 - Math.exp(-GAME_CONFIG.CAMERA.CAMERA_SMOOTHING * deltaTime);
    this.smoothedCamPos = Vector3.Lerp(this.smoothedCamPos, desiredCamPos, camLerp);

    const upLerp = 1 - Math.exp(-GAME_CONFIG.CAMERA.ROTATION_SMOOTHING * deltaTime);
    this.smoothedUpVector = Vector3.Lerp(this.smoothedUpVector, normal, upLerp).normalize();

    // 5. Application à la TargetCamera
    this.camera.position.copyFrom(this.smoothedCamPos);
    this.camera.setTarget(this.smoothedHolePos);
    this.camera.upVector.copyFrom(this.smoothedUpVector);
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
