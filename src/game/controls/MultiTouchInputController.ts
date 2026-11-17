import * as THREE from 'three';
import { HALF_LENGTH, SURFACE_Y } from '@/game/constants/arena';
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
  private landscapeView = false;
  private touchSensitivity = 1.0;

  private canvasRect: DOMRect | null = null;
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
    this.updateRect();
    this.bindEvents();
  }

  public updateRect(): void {
    this.canvasRect = this.canvas.getBoundingClientRect();
  }

  public setTouchSensitivity(sens: number): void {
    this.touchSensitivity = Number.isFinite(sens)
      ? Math.max(0.75, Math.min(1.35, sens))
      : 1.0;
  }

  public setLandscapeView(enabled: boolean): void {
    this.landscapeView = enabled;
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
    } else {
      this.updateRect();
    }
  }

  public clearPointers(): void {
    if (this.p1PointerId !== null) this.safeRelease(this.p1PointerId);
    if (this.p2PointerId !== null) this.safeRelease(this.p2PointerId);
    this.p1PointerId = null;
    this.p2PointerId = null;
  }

  private applyDirectionalNudge(player: 1 | 2, screenRight: number, screenDown: number, dt: number): void {
    const keySpeed = 3.1;
    const len = Math.hypot(screenRight, screenDown);
    if (len <= 0) return;
    const nr = (screenRight / len) * keySpeed * dt;
    const nd = (screenDown / len) * keySpeed * dt;
    if (this.landscapeView) {
      // Camera up = (-1, 0, 0), P1 left (+Z) / P2 right (-Z):
      // screenRight -> -Z, screenDown -> +X
      this.physics.nudgePaddleTarget(player, nd, -nr);
    } else {
      this.physics.nudgePaddleTarget(player, nr, nd);
    }
  }

  public updateKeyboard(dt: number): void {
    if (!this.active) return;

    let p1r = 0;
    let p1d = 0;
    if (this.heldKeys.has('ArrowLeft')) p1r -= 1;
    if (this.heldKeys.has('ArrowRight')) p1r += 1;
    if (this.heldKeys.has('ArrowUp')) p1d -= 1;
    if (this.heldKeys.has('ArrowDown')) p1d += 1;

    if (this.mode !== 'two_player') {
      if (this.heldKeys.has('KeyA')) p1r -= 1;
      if (this.heldKeys.has('KeyD')) p1r += 1;
      if (this.heldKeys.has('KeyW')) p1d -= 1;
      if (this.heldKeys.has('KeyS')) p1d += 1;
    }

    if (p1r !== 0 || p1d !== 0) {
      this.applyDirectionalNudge(1, p1r, p1d, dt);
    }

    if (this.mode === 'two_player') {
      let p2r = 0;
      let p2d = 0;
      if (this.heldKeys.has('KeyA')) p2r -= 1;
      if (this.heldKeys.has('KeyD')) p2r += 1;
      if (this.heldKeys.has('KeyW')) p2d -= 1;
      if (this.heldKeys.has('KeyS')) p2d += 1;
      if (p2r !== 0 || p2d !== 0) {
        this.applyDirectionalNudge(2, p2r, p2d, dt);
      }
    }
  }

  private screenToTable(
    clientX: number,
    clientY: number,
    playerForSensitivity?: 1 | 2
  ): { x: number; z: number } | null {
    const rect = this.canvasRect;
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      this.updateRect();
    }
    const r = this.canvasRect;
    if (!r || r.width <= 0 || r.height <= 0) return null;

    const relX = (clientX - r.left) / r.width;
    const relY = (clientY - r.top) / r.height;

    this.ndc.set(relX * 2 - 1, -(relY * 2 - 1));
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hit = this.raycaster.ray.intersectPlane(
      this.tablePlane,
      this.intersectPt
    );
    if (!hit) return null;

    if (this.touchSensitivity === 1.0 || !playerForSensitivity) {
      return { x: hit.x, z: hit.z };
    }

    const pivotZ =
      playerForSensitivity === 1 ? HALF_LENGTH * 0.5 : -HALF_LENGTH * 0.5;
    return {
      x: hit.x * this.touchSensitivity,
      z: pivotZ + (hit.z - pivotZ) * this.touchSensitivity,
    };
  }

  private handlePointerDown = (e: PointerEvent): void => {
    this.onFirstGesture?.();
    if (!this.active) return;

    this.updateRect();
    if (e.pointerType !== 'mouse') {
      e.preventDefault();
    }

    const rawPos = this.screenToTable(e.clientX, e.clientY);
    if (!rawPos) return;

    if (this.mode === 'two_player') {
      const wantsP1 = rawPos.z >= 0;
      if (wantsP1) {
        if (this.p1PointerId === null) {
          this.p1PointerId = e.pointerId;
          this.safeCapture(e.pointerId);
          const pos = this.screenToTable(e.clientX, e.clientY, 1) ?? rawPos;
          this.physics.snapPaddleTo(1, pos.x, pos.z);
        }
      } else if (this.p2PointerId === null) {
        this.p2PointerId = e.pointerId;
        this.safeCapture(e.pointerId);
        const pos = this.screenToTable(e.clientX, e.clientY, 2) ?? rawPos;
        this.physics.snapPaddleTo(2, pos.x, pos.z);
      }
    } else {
      // Single-player: allow seamless re-grab even if a previous pointer became stale
      if (this.p1PointerId !== null && this.p1PointerId !== e.pointerId) {
        this.safeRelease(this.p1PointerId);
      }
      this.p1PointerId = e.pointerId;
      this.safeCapture(e.pointerId);
      const pos = this.screenToTable(e.clientX, e.clientY, 1) ?? rawPos;
      this.physics.snapPaddleTo(1, pos.x, pos.z);
    }
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.active) return;

    if (e.pointerType !== 'mouse') {
      e.preventDefault();
    }

    const coalesced =
      typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : null;
    const latest =
      coalesced && coalesced.length > 0 ? coalesced[coalesced.length - 1] : e;

    if (e.pointerId === this.p1PointerId) {
      const pos = this.screenToTable(latest.clientX, latest.clientY, 1);
      if (pos) this.physics.setPaddleTarget(1, pos.x, pos.z);
      return;
    }

    if (e.pointerId === this.p2PointerId && this.mode === 'two_player') {
      const pos = this.screenToTable(latest.clientX, latest.clientY, 2);
      if (pos) this.physics.setPaddleTarget(2, pos.x, pos.z);
      return;
    }

    if (
      e.pointerType === 'mouse' &&
      this.p1PointerId === null &&
      this.mode !== 'two_player'
    ) {
      const pos = this.screenToTable(latest.clientX, latest.clientY, 1);
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

  private handleTouchBlock = (e: TouchEvent): void => {
    if (this.active) {
      e.preventDefault();
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
    this.canvas.addEventListener('touchstart', this.handleTouchBlock, {
      passive: false,
    });
    this.canvas.addEventListener('touchmove', this.handleTouchBlock, {
      passive: false,
    });

    window.addEventListener('pointerup', this.handlePointerEnd);
    window.addEventListener('pointercancel', this.handlePointerEnd);
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
    this.canvas.removeEventListener('touchstart', this.handleTouchBlock);
    this.canvas.removeEventListener('touchmove', this.handleTouchBlock);

    window.removeEventListener('pointerup', this.handlePointerEnd);
    window.removeEventListener('pointercancel', this.handlePointerEnd);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  }
}
