import * as THREE from 'three';
import { SURFACE_Y } from '@/game/constants/arena';
import type { AirHockeyPhysics } from '@/game/physics/AirHockeyPhysics';
import type { GameMode } from '@/types/game';

export class MultiTouchInputController {
  private canvas: HTMLCanvasElement;
  private camera: THREE.Camera;
  private physics: AirHockeyPhysics;

  private p1PointerId: number | null = null;
  private p2PointerId: number | null = null;
  private mode: GameMode = 'vs_ai';
  private active = false;

  private readonly tablePlane = new THREE.Plane(
    new THREE.Vector3(0, 1, 0),
    -SURFACE_Y
  );
  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private readonly intersectPt = new THREE.Vector3();
  private readonly heldKeys = new Set<string>();

  private onFirstGesture?: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    camera: THREE.Camera,
    physics: AirHockeyPhysics,
    onFirstGesture?: () => void
  ) {
    this.canvas = canvas;
    this.camera = camera;
    this.physics = physics;
    this.onFirstGesture = onFirstGesture;

    this.bindEvents();
  }

  public setMode(mode: GameMode): void {
    this.mode = mode;
    this.clearPointers();
  }

  public setActive(active: boolean): void {
    this.active = active;
    if (!active) {
      this.clearPointers();
      this.heldKeys.clear();
    }
  }

  public clearPointers(): void {
    this.p1PointerId = null;
    this.p2PointerId = null;
  }

  public updateKeyboard(dt: number): void {
    if (!this.active) return;
    const keySpeed = 2.85;

    let p1dx = 0;
    let p1dz = 0;
    if (this.heldKeys.has('ArrowLeft')) p1dx -= 1;
    if (this.heldKeys.has('ArrowRight')) p1dx += 1;
    if (this.heldKeys.has('ArrowUp')) p1dz -= 1;
    if (this.heldKeys.has('ArrowDown')) p1dz += 1;

    if (this.mode !== 'two_player') {
      if (this.heldKeys.has('KeyA')) p1dx -= 1;
      if (this.heldKeys.has('KeyD')) p1dx += 1;
      if (this.heldKeys.has('KeyW')) p1dz -= 1;
      if (this.heldKeys.has('KeyS')) p1dz += 1;
    }

    if (p1dx !== 0 || p1dz !== 0) {
      const len = Math.hypot(p1dx, p1dz);
      this.physics.nudgePaddleTarget(
        1,
        (p1dx / len) * keySpeed * dt,
        (p1dz / len) * keySpeed * dt
      );
    }

    if (this.mode === 'two_player') {
      let p2dx = 0;
      let p2dz = 0;
      if (this.heldKeys.has('KeyA')) p2dx -= 1;
      if (this.heldKeys.has('KeyD')) p2dx += 1;
      if (this.heldKeys.has('KeyW')) p2dz -= 1;
      if (this.heldKeys.has('KeyS')) p2dz += 1;
      if (p2dx !== 0 || p2dz !== 0) {
        const len = Math.hypot(p2dx, p2dz);
        this.physics.nudgePaddleTarget(
          2,
          (p2dx / len) * keySpeed * dt,
          (p2dz / len) * keySpeed * dt
        );
      }
    }
  }

  private screenToTable(
    clientX: number,
    clientY: number
  ): { x: number; z: number; screenHalf: 'bottom' | 'top' } | null {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;

    this.ndc.set(relX * 2 - 1, -(relY * 2 - 1));
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hit = this.raycaster.ray.intersectPlane(
      this.tablePlane,
      this.intersectPt
    );
    if (!hit) return null;

    return {
      x: hit.x,
      z: hit.z,
      screenHalf: relY >= 0.5 ? 'bottom' : 'top',
    };
  }

  private handlePointerDown = (e: PointerEvent): void => {
    this.onFirstGesture?.();
    if (!this.active) return;

    if (e.pointerType !== 'mouse') {
      e.preventDefault();
    }

    const pos = this.screenToTable(e.clientX, e.clientY);
    if (!pos) return;

    if (this.mode === 'two_player') {
      const wantsP1 = pos.z >= 0;
      if (wantsP1) {
        if (this.p1PointerId === null) {
          this.p1PointerId = e.pointerId;
          this.safeCapture(e.pointerId);
          this.physics.setPaddleTarget(1, pos.x, pos.z);
        }
      } else if (this.p2PointerId === null) {
        this.p2PointerId = e.pointerId;
        this.safeCapture(e.pointerId);
        this.physics.setPaddleTarget(2, pos.x, pos.z);
      }
    } else if (this.p1PointerId === null) {
      this.p1PointerId = e.pointerId;
      this.safeCapture(e.pointerId);
      this.physics.setPaddleTarget(1, pos.x, pos.z);
    }
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.active) return;

    if (e.pointerId === this.p1PointerId) {
      const pos = this.screenToTable(e.clientX, e.clientY);
      if (pos) this.physics.setPaddleTarget(1, pos.x, pos.z);
      return;
    }

    if (e.pointerId === this.p2PointerId && this.mode === 'two_player') {
      const pos = this.screenToTable(e.clientX, e.clientY);
      if (pos) this.physics.setPaddleTarget(2, pos.x, pos.z);
      return;
    }

    if (
      e.pointerType === 'mouse' &&
      this.p1PointerId === null &&
      this.mode !== 'two_player'
    ) {
      const pos = this.screenToTable(e.clientX, e.clientY);
      if (pos) this.physics.setPaddleTarget(1, pos.x, pos.z);
    }
  };

  private handlePointerEnd = (e: PointerEvent): void => {
    if (e.pointerId === this.p1PointerId) {
      this.p1PointerId = null;
      this.safeRelease(e.pointerId);
    }
    if (e.pointerId === this.p2PointerId) {
      this.p2PointerId = null;
      this.safeRelease(e.pointerId);
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable)
    ) {
      return;
    }
    this.onFirstGesture?.();
    if (
      this.active &&
      (e.code === 'ArrowUp' ||
        e.code === 'ArrowDown' ||
        e.code === 'ArrowLeft' ||
        e.code === 'ArrowRight' ||
        e.code === 'Space')
    ) {
      e.preventDefault();
    }
    this.heldKeys.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.heldKeys.delete(e.code);
  };

  private handleBlur = (): void => {
    this.heldKeys.clear();
    this.clearPointers();
  };

  private safeCapture(pointerId: number): void {
    try {
      this.canvas.setPointerCapture(pointerId);
    } catch {
      // Ignore synthetic or non-capturable pointers
    }
  }

  private safeRelease(pointerId: number): void {
    try {
      if (this.canvas.hasPointerCapture(pointerId)) {
        this.canvas.releasePointerCapture(pointerId);
      }
    } catch {
      // Ignore
    }
  }

  private bindEvents(): void {
    this.canvas.addEventListener('pointerdown', this.handlePointerDown, {
      passive: false,
    });
    this.canvas.addEventListener('pointermove', this.handlePointerMove, {
      passive: false,
    });
    this.canvas.addEventListener('pointerup', this.handlePointerEnd);
    this.canvas.addEventListener('pointercancel', this.handlePointerEnd);
    this.canvas.addEventListener('lostpointercapture', this.handlePointerEnd);

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  public dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerEnd);
    this.canvas.removeEventListener('pointercancel', this.handlePointerEnd);
    this.canvas.removeEventListener('lostpointercapture', this.handlePointerEnd);

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  }
}
