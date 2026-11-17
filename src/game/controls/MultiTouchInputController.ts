import * as THREE from 'three';
import { SURFACE_Y } from '@/game/constants/arena';
import type { AirHockeyPhysics } from '@/game/physics/AirHockeyPhysics';
import type { GameMode } from '@/types/game';

export class MultiTouchInputController {
  private canvas: HTMLCanvasElement;
  private camera: THREE.Camera;
  private physics: AirHockeyPhysics;
  private onDirectPaddleMove?: (player: 1 | 2, x: number, z: number) => void;

  private p1PointerId: number | null = null;
  private p2PointerId: number | null = null;
  private mode: GameMode = 'vs_ai';
  private active = false;
  private landscapeView = false;

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
    onFirstGesture?: () => void,
    onDirectPaddleMove?: (player: 1 | 2, x: number, z: number) => void
  ) {
    this.canvas = canvas;
    this.camera = camera;
    this.physics = physics;
    this.onFirstGesture = onFirstGesture;
    this.onDirectPaddleMove = onDirectPaddleMove;

    this.canvas.style.touchAction = 'none';
    this.updateRect();
    this.bindEvents();
  }

  public updateRect(): void {
    this.canvasRect = this.canvas.getBoundingClientRect();
  }

  public setTouchSensitivity(_sens: number): void {
    // Retained for API compatibility; direct 1:1 finger tracking is strictly enforced
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
    if (this.p1PointerId !== null) {
      this.safeRelease(this.p1PointerId);
      this.physics.clearDirectPaddleVelocity(1);
    }
    if (this.p2PointerId !== null) {
      this.safeRelease(this.p2PointerId);
      this.physics.clearDirectPaddleVelocity(2);
    }
    this.p1PointerId = null;
    this.p2PointerId = null;
  }

  private applyDirectionalNudge(
    player: 1 | 2,
    screenRight: number,
    screenDown: number,
    dt: number
  ): void {
    const keySpeed = 3.6;
    const len = Math.hypot(screenRight, screenDown);
    if (len <= 0) return;
    const nr = (screenRight / len) * keySpeed * dt;
    const nd = (screenDown / len) * keySpeed * dt;
    const pad = player === 1 ? this.physics.p1 : this.physics.p2;

    if (this.landscapeView) {
      // Landscape framing: screenRight -> -Z, screenDown -> +X
      this.physics.setDirectPaddlePosition(player, pad.x + nd, pad.z - nr);
    } else {
      this.physics.setDirectPaddlePosition(player, pad.x + nr, pad.z + nd);
    }
    this.onDirectPaddleMove?.(player, pad.x, pad.z);
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

  /**
   * Directly unprojects 2D screen coordinates into 3D table surface coordinates.
   * Guarantees 1:1 mathematical alignment under the finger with zero offset.
   */
  private screenToTable(
    clientX: number,
    clientY: number
  ): { x: number; z: number } | null {
    let r = this.canvasRect;
    if (!r || r.width <= 0 || r.height <= 0) {
      this.updateRect();
      r = this.canvasRect;
    }
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

    return { x: hit.x, z: hit.z };
  }

  private handlePointerDown = (e: PointerEvent): void => {
    this.onFirstGesture?.();
    if (!this.active) return;

    this.updateRect();
    if (e.pointerType !== 'mouse') {
      e.preventDefault();
    }

    const pos = this.screenToTable(e.clientX, e.clientY);
    if (!pos) return;

    const time = e.timeStamp || performance.now();

    if (this.mode === 'two_player') {
      const wantsP1 = pos.z >= 0;
      if (wantsP1) {
        if (this.p1PointerId === null) {
          this.p1PointerId = e.pointerId;
          this.safeCapture(e.pointerId);
          this.physics.setDirectPaddlePosition(1, pos.x, pos.z, time);
          this.onDirectPaddleMove?.(1, this.physics.p1.x, this.physics.p1.z);
        }
      } else if (this.p2PointerId === null) {
        this.p2PointerId = e.pointerId;
        this.safeCapture(e.pointerId);
        this.physics.setDirectPaddlePosition(2, pos.x, pos.z, time);
        this.onDirectPaddleMove?.(2, this.physics.p2.x, this.physics.p2.z);
      }
    } else {
      // Single-player mode: always claim P1 with seamless re-grab
      if (this.p1PointerId !== null && this.p1PointerId !== e.pointerId) {
        this.safeRelease(this.p1PointerId);
      }
      this.p1PointerId = e.pointerId;
      this.safeCapture(e.pointerId);
      this.physics.setDirectPaddlePosition(1, pos.x, pos.z, time);
      this.onDirectPaddleMove?.(1, this.physics.p1.x, this.physics.p1.z);
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
    const time = latest.timeStamp || performance.now();

    if (e.pointerId === this.p1PointerId) {
      const pos = this.screenToTable(latest.clientX, latest.clientY);
      if (pos) {
        this.physics.setDirectPaddlePosition(1, pos.x, pos.z, time);
        this.onDirectPaddleMove?.(1, this.physics.p1.x, this.physics.p1.z);
      }
      return;
    }

    if (e.pointerId === this.p2PointerId && this.mode === 'two_player') {
      const pos = this.screenToTable(latest.clientX, latest.clientY);
      if (pos) {
        this.physics.setDirectPaddlePosition(2, pos.x, pos.z, time);
        this.onDirectPaddleMove?.(2, this.physics.p2.x, this.physics.p2.z);
      }
      return;
    }

    // Direct cursor tracking for mouse users without requiring down-drag
    if (
      e.pointerType === 'mouse' &&
      this.p1PointerId === null &&
      this.mode !== 'two_player'
    ) {
      const pos = this.screenToTable(latest.clientX, latest.clientY);
      if (pos) {
        this.physics.setDirectPaddlePosition(1, pos.x, pos.z, time);
        this.onDirectPaddleMove?.(1, this.physics.p1.x, this.physics.p1.z);
      }
    }
  };

  private handlePointerEnd = (e: PointerEvent): void => {
    if (e.pointerId === this.p1PointerId) {
      this.p1PointerId = null;
      this.safeRelease(e.pointerId);
      this.physics.clearDirectPaddleVelocity(1);
    }
    if (e.pointerId === this.p2PointerId) {
      this.p2PointerId = null;
      this.safeRelease(e.pointerId);
      this.physics.clearDirectPaddleVelocity(2);
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

    window.addEventListener('resize', () => this.updateRect());
    window.addEventListener('scroll', () => this.updateRect(), { passive: true });
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
