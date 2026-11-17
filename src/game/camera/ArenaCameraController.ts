import * as THREE from 'three';
import {
  RAIL_THICKNESS,
  SURFACE_Y,
  TABLE_LENGTH,
  TABLE_WIDTH,
} from '@/game/constants/arena';
import type { CinematicStage } from '@/game/gameplay/CinematicChoreography';
import type {
  CameraViewMode,
  MatchPhase,
  TableOrientationMode,
} from '@/types/game';

export class ArenaCameraController {
  public readonly camera: THREE.PerspectiveCamera;

  private readonly targetCamPos = new THREE.Vector3(0, 3.6, 0.7);
  private readonly targetLookAt = new THREE.Vector3(0, SURFACE_Y, 0);
  private readonly currentLookAt = new THREE.Vector3(0, SURFACE_Y, 0);
  private readonly targetUp = new THREE.Vector3(0, 1, 0);

  private camShake = 0;
  private menuOrbitAngle = 0;

  constructor(width: number, height: number) {
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 30);
  }

  public setAspect(width: number, height: number): void {
    this.camera.aspect = Math.max(1, width) / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  public isLandscapeActive(tableOrientation: TableOrientationMode): boolean {
    if (tableOrientation === 'landscape') return true;
    if (tableOrientation === 'vertical') return false;
    return (this.camera.aspect || 1) >= 1.25;
  }

  public snapToInitial(
    cameraView: CameraViewMode,
    tableOrientation: TableOrientationMode,
    reducedMotion: boolean
  ): void {
    this.computeTargets({
      dt: 0,
      phase: 'idle',
      cinematicStage: 'none',
      cinematicTimer: 0,
      puckX: 0,
      puckZ: 0,
      cameraView,
      tableOrientation,
      reducedMotion,
    });
    this.camera.up.copy(this.targetUp);
    this.camera.position.copy(this.targetCamPos);
    this.currentLookAt.copy(this.targetLookAt);
    this.camera.lookAt(this.currentLookAt);
  }

  public addShake(amount: number, maxCap = 0.024): void {
    this.camShake = Math.min(maxCap, this.camShake + amount);
  }

  public setShake(amount: number): void {
    this.camShake = amount;
  }

  public update(params: {
    dt: number;
    phase: MatchPhase;
    cinematicStage: CinematicStage;
    cinematicTimer: number;
    puckX: number;
    puckZ: number;
    cameraView: CameraViewMode;
    tableOrientation: TableOrientationMode;
    reducedMotion: boolean;
  }): void {
    this.computeTargets(params);

    const camDamp = params.phase === 'cinematic' ? 3.8 : 6.5;
    this.camera.up.lerp(this.targetUp, 1 - Math.exp(-camDamp * params.dt)).normalize();

    this.camera.position.x = THREE.MathUtils.damp(
      this.camera.position.x,
      this.targetCamPos.x,
      camDamp,
      params.dt
    );
    this.camera.position.y = THREE.MathUtils.damp(
      this.camera.position.y,
      this.targetCamPos.y,
      camDamp,
      params.dt
    );
    this.camera.position.z = THREE.MathUtils.damp(
      this.camera.position.z,
      this.targetCamPos.z,
      camDamp,
      params.dt
    );
    this.currentLookAt.x = THREE.MathUtils.damp(
      this.currentLookAt.x,
      this.targetLookAt.x,
      camDamp,
      params.dt
    );
    this.currentLookAt.y = THREE.MathUtils.damp(
      this.currentLookAt.y,
      this.targetLookAt.y,
      camDamp,
      params.dt
    );
    this.currentLookAt.z = THREE.MathUtils.damp(
      this.currentLookAt.z,
      this.targetLookAt.z,
      camDamp,
      params.dt
    );

    if (this.camShake > 0.0002) {
      const sx = (Math.random() - 0.5) * 2 * this.camShake;
      const sz = (Math.random() - 0.5) * 2 * this.camShake;
      this.camera.position.x += sx;
      this.camera.position.z += sz;
      this.camShake *= Math.exp(-16 * params.dt);
    } else {
      this.camShake = 0;
    }

    this.camera.lookAt(this.currentLookAt);
  }

  private computeTargets(params: {
    dt: number;
    phase: MatchPhase;
    cinematicStage: CinematicStage;
    cinematicTimer: number;
    puckX: number;
    puckZ: number;
    cameraView: CameraViewMode;
    tableOrientation: TableOrientationMode;
    reducedMotion: boolean;
  }): void {
    const aspect = this.camera.aspect || 1;
    const vFovRad = THREE.MathUtils.degToRad(this.camera.fov);
    const tanHalfFov = Math.tan(vFovRad / 2);

    const totalW = TABLE_WIDTH + RAIL_THICKNESS * 2;
    const totalL = TABLE_LENGTH + RAIL_THICKNESS * 2 + 0.14;

    const isPortrait = aspect < 0.85;
    const marginY = isPortrait ? 1.07 : 1.045;
    const marginX = isPortrait ? 1.03 : 1.05;
    const distV = (totalL * 0.5 * marginY) / tanHalfFov;
    const distH = (totalW * 0.5 * marginX) / (tanHalfFov * aspect);
    const baseDist = Math.max(distV, distH);

    if (params.phase === 'cinematic') {
      this.targetUp.set(0, 1, 0);
      if (params.cinematicStage === 'table_reveal') {
        const angle = -0.8 + params.cinematicTimer * 0.58;
        const r = Math.min(2.8, baseDist * 0.78);
        this.targetCamPos.set(
          Math.sin(angle) * r,
          SURFACE_Y + 1.15,
          Math.cos(angle) * r
        );
        this.targetLookAt.set(0, SURFACE_Y, 0);
        return;
      }
      if (params.cinematicStage === 'gameplay_rally') {
        const sweep = Math.sin(params.cinematicTimer * 0.9) * 0.65;
        this.targetCamPos.set(
          sweep,
          SURFACE_Y + 1.32,
          1.95 - Math.min(0.55, params.cinematicTimer * 0.16)
        );
        this.targetLookAt.set(
          params.puckX * 0.35,
          SURFACE_Y,
          params.puckZ * 0.35
        );
        return;
      }
    }

    if (params.phase === 'idle' || params.cinematicStage === 'menu_blend') {
      this.targetUp.set(0, 1, 0);
      if (!params.reducedMotion) {
        this.menuOrbitAngle += params.dt * 0.18;
      }
      const orbitDist = baseDist * 0.92;
      const elevation = orbitDist * 0.62;
      const radiusXZ = orbitDist * 0.72;
      this.targetCamPos.set(
        Math.sin(this.menuOrbitAngle) * radiusXZ * 0.55,
        SURFACE_Y + elevation,
        Math.cos(this.menuOrbitAngle) * radiusXZ * 0.55 + 0.45
      );
      this.targetLookAt.set(0, SURFACE_Y, 0);
      return;
    }

    const useLandscape = this.isLandscapeActive(params.tableOrientation);
    const isTopDown = params.cameraView === 'top_down';

    if (useLandscape) {
      // Landscape framing: Player 1 (+Z) on Left side, Player 2 (-Z) on Right side; screen-up = -X
      this.targetUp.set(-1, 0, 0);
      const landDistV = (totalW * 0.5 * 1.12) / tanHalfFov;
      const landDistH = (totalL * 0.5 * 1.045) / (tanHalfFov * aspect);
      const landDist = Math.max(landDistV, landDistH);
      const tiltDeg = isTopDown ? 0 : 7.5;
      const tiltRad = THREE.MathUtils.degToRad(tiltDeg);
      const lookXOffset = -0.025;
      const effectiveDist = landDist / Math.max(0.94, Math.cos(tiltRad));

      this.targetCamPos.set(
        lookXOffset + Math.sin(tiltRad) * effectiveDist,
        SURFACE_Y + Math.cos(tiltRad) * effectiveDist,
        0
      );
      this.targetLookAt.set(lookXOffset, SURFACE_Y, 0);
      return;
    }

    this.targetUp.set(0, 1, 0);
    const tiltDeg = isTopDown ? 0 : isPortrait ? 3.5 : 8.5;
    const tiltRad = THREE.MathUtils.degToRad(tiltDeg);
    const lookZOffset = isPortrait ? -0.055 : -0.03;
    const effectiveDist = baseDist / Math.max(0.94, Math.cos(tiltRad));

    this.targetCamPos.set(
      0,
      SURFACE_Y + Math.cos(tiltRad) * effectiveDist,
      lookZOffset + Math.sin(tiltRad) * effectiveDist
    );
    this.targetLookAt.set(0, SURFACE_Y, lookZOffset);
  }
}
