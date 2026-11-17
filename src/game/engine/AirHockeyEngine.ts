import * as THREE from 'three';
import { SoundEngine } from '@/audio/SoundEngine';
import { HockeyAI } from '@/game/ai/HockeyAI';
import { ArenaCameraController } from '@/game/camera/ArenaCameraController';
import { HALF_LENGTH, SPEED_TO_KMH, SURFACE_Y } from '@/game/constants/arena';
import { MultiTouchInputController } from '@/game/controls/MultiTouchInputController';
import {
  CinematicChoreography,
  type CinematicStage,
} from '@/game/gameplay/CinematicChoreography';
import { AirHockeyPhysics } from '@/game/physics/AirHockeyPhysics';
import { buildArenaScene, type BuiltSceneObjects } from '@/game/scene/sceneBuilder';
import { ArenaVFX } from '@/game/vfx/ArenaVFX';
import type {
  LiveMatchHUDState,
  MatchConfig,
  MatchPhase,
  PlayerIdentity,
  QualityPreset,
  UserPreferences,
} from '@/types/game';
import { detectSoftwareWebGL, scheduleAfterDraw } from '@/utils/webgl';

export type { CinematicStage };

export interface EngineCallbacks {
  onHUDUpdate: (hud: LiveMatchHUDState) => void;
  onSpeedUpdate?: (puckSpeedKmh: number, topSpeedKmh: number) => void;
  onMatchFinished: (hud: LiveMatchHUDState) => void;
  onCinematicGoal?: () => void;
  onContextLost?: () => void;
  onContextRestored?: () => void;
}

export class AirHockeyEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private cameraController: ArenaCameraController;
  private sceneObjects: BuiltSceneObjects;
  private physics: AirHockeyPhysics;
  private ai: HockeyAI;
  private audio: SoundEngine;
  private vfx: ArenaVFX;
  private input: MultiTouchInputController;
  private cinematic: CinematicChoreography;
  private callbacks: EngineCallbacks;

  private readonly isSoftwareGl: boolean;
  private readonly clock = new THREE.Clock();
  private frameId = 0;
  private frameIsTimer = false;
  private disposed = false;
  private elapsedTime = 0;

  // Match state
  private matchId = '';
  private config: MatchConfig;
  private prefs: UserPreferences;
  private phase: MatchPhase = 'idle';
  private phaseBeforePause: 'active' | 'countdown' | 'goal_pause' = 'active';
  private score1 = 0;
  private score2 = 0;
  private remainingSeconds = 180;
  private countdownTimer = 0;
  private lastCountdownStep = -1;
  private goalPauseTimer = 0;
  private pendingServe: 'center' | 'p1' | 'p2' = 'center';
  private lastGoalScorer: 'p1' | 'p2' | null = null;
  private lastGoalSpeedKmh = 0;
  private winner: 'p1' | 'p2' | 'draw' | null = null;
  private practiceSparring = false;
  private winningGoalPending = false;
  private lastHudEmitKey = '';

  // Frame pacing & juice
  private hitstopTimer = 0;
  private goalFlashP1 = 0;
  private goalFlashP2 = 0;
  private speedSyncAccumulator = 0;
  private resizeObserver: ResizeObserver;

  constructor(
    container: HTMLElement,
    initialConfig: MatchConfig,
    initialPrefs: UserPreferences,
    initialProfiles: { p1: PlayerIdentity; p2: PlayerIdentity },
    callbacks: EngineCallbacks
  ) {
    this.container = container;
    this.config = { ...initialConfig };
    this.prefs = { ...initialPrefs };
    this.callbacks = callbacks;

    this.isSoftwareGl = detectSoftwareWebGL();
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvas = this.renderer.domElement;
    canvas.className = 'block w-full h-full touch-gameplay outline-none';
    canvas.style.touchAction = 'none';
    this.container.appendChild(canvas);

    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);

    this.scene = new THREE.Scene();
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    this.cameraController = new ArenaCameraController(width, height);

    this.sceneObjects = buildArenaScene(
      this.scene,
      this.renderer,
      this.isSoftwareGl
    );
    this.audio = new SoundEngine();
    this.vfx = new ArenaVFX(this.scene);
    this.ai = new HockeyAI();
    this.cinematic = new CinematicChoreography();

    this.physics = new AirHockeyPhysics({
      onPaddleHit: (player, x, z, impactSpeed) => {
        this.audio.playPaddleHit(impactSpeed);
        this.vfx.spawnImpact(
          x,
          z,
          Math.min(1.3, impactSpeed / 4.2),
          player === 1 ? 'p1' : 'p2'
        );
        if (this.phase === 'active' && impactSpeed > 2.2) {
          this.vibrate(12);
        }
        if (!this.prefs.reducedMotion && impactSpeed > 3.6) {
          this.cameraController.addShake(impactSpeed * 0.0022, 0.018);
          this.hitstopTimer = this.phase === 'cinematic' ? 0 : 0.024;
        }
      },
      onWallHit: (x, z, impactSpeed) => {
        this.audio.playWallHit(impactSpeed);
        this.vfx.spawnImpact(x, z, Math.min(1.0, impactSpeed / 4.5), 'wall');
        if (!this.prefs.reducedMotion && impactSpeed > 4.2) {
          this.cameraController.addShake(impactSpeed * 0.0014, 0.012);
        }
      },
      onGoal: (scorer, puckSpeedKmh) => {
        if (this.phase === 'cinematic') {
          this.audio.playGoal(scorer === 1);
          this.goalFlashP2 = scorer === 1 ? 1.0 : 0;
          this.goalFlashP1 = scorer === 2 ? 1.0 : 0;
          this.vfx.spawnGoalBurst(scorer === 1 ? -HALF_LENGTH : HALF_LENGTH, scorer);
          this.cameraController.setShake(this.prefs.reducedMotion ? 0 : 0.022);
          this.callbacks.onCinematicGoal?.();
          return;
        }
        this.handleGoalScored(scorer, puckSpeedKmh);
      },
    });

    this.input = new MultiTouchInputController(
      canvas,
      this.cameraController.camera,
      this.physics,
      () => this.audio.unlock()
    );

    this.applyPreferences(this.prefs);
    this.applyCosmetics(initialProfiles.p1, initialProfiles.p2);
    this.updateSize();

    this.resizeObserver = new ResizeObserver(() => this.updateSize());
    this.resizeObserver.observe(this.container);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.cameraController.camera);
    }

    this.cameraController.snapToInitial(this.prefs.cameraView, this.prefs.reducedMotion);

    this.clock.start();
    this.startLoop();
  }

  public unlockAudio(): void {
    this.audio.unlock();
  }

  public playUIClick(): void {
    this.audio.unlock();
    this.audio.playClick();
  }

  public playIntroSweep(): void {
    this.audio.unlock();
    this.audio.playIntroSweep();
  }

  public playIntroImpact(): void {
    this.audio.unlock();
    this.audio.playIntroImpact();
  }

  public playCoinEarned(): void {
    this.audio.unlock();
    this.audio.playCoinEarned();
  }

  public playPurchaseSuccess(): void {
    this.audio.unlock();
    this.audio.playPurchaseSuccess();
  }

  public applyCosmetics(p1: PlayerIdentity, p2: PlayerIdentity): void {
    this.sceneObjects.setStrikerAppearance(
      1,
      p1.strikerId,
      p1.strikerColorId,
      p1.customColorHex
    );
    this.sceneObjects.setStrikerAppearance(
      2,
      p2.strikerId,
      p2.strikerColorId,
      p2.customColorHex
    );
    this.sceneObjects.setTableTheme(p1.tableThemeId);
    if (p1.arenaBgId !== 'midnight_arcade') {
      this.sceneObjects.setArenaBackground(p1.arenaBgId);
    }
    this.sceneObjects.setPuckSkin(p1.puckSkinId);
    this.vfx.setTrailEffect(p1.trailEffectId);
    this.vfx.setGoalEffect(p1.goalEffectId);
  }

  public setCinematicStage(stage: CinematicStage): void {
    this.cinematic.startStage(stage, this.physics, this.vfx);
    this.input.setActive(false);
    this.physics.setPaddleDirectControl(1, false);
    this.physics.setPaddleDirectControl(2, false);
    this.phase = stage === 'none' ? 'idle' : 'cinematic';
  }

  public updateConfig(config: MatchConfig): void {
    this.config = { ...config };
    this.ai.setDifficulty(this.config.difficulty);
    this.input.setMode(this.config.mode);
    if (this.config.mode === 'practice') {
      this.physics.speedScale = this.config.practiceSpeedMultiplier;
    } else {
      this.physics.speedScale = 1.0;
    }
    this.syncPaddleControlModes();
  }

  public applyPreferences(prefs: UserPreferences): void {
    this.prefs = { ...prefs };
    this.audio.applyPreferences(prefs);
    this.vfx.reducedMotion = prefs.reducedMotion;
    this.input.setTouchSensitivity(prefs.touchSensitivity);

    const quality = this.resolveQuality(prefs.quality);
    if (this.isSoftwareGl) {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      this.vfx.enabled = false;
    } else if (quality === 'low') {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      this.vfx.enabled = false;
    } else if (quality === 'balanced') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.needsUpdate = true;
      this.vfx.enabled = true;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.needsUpdate = true;
      this.vfx.enabled = true;
    }

    if (!this.vfx.enabled || this.vfx.reducedMotion) {
      this.vfx.clearTrail();
    }
    this.updateSize();
  }

  private resolveQuality(preset: QualityPreset): 'high' | 'balanced' | 'low' {
    if (preset !== 'auto') return preset;
    const cores = navigator.hardwareConcurrency || 4;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && cores <= 4) return 'balanced';
    return 'high';
  }

  public startMatch(config: MatchConfig): void {
    this.cinematic.stage = 'none';
    this.matchId = `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.updateConfig(config);
    this.audio.unlock();
    this.score1 = 0;
    this.score2 = 0;
    this.remainingSeconds =
      config.mode === 'practice' ? 0 : config.durationSeconds;
    this.lastGoalScorer = null;
    this.lastGoalSpeedKmh = 0;
    this.pendingServe = 'center';
    this.winner = null;
    this.winningGoalPending = false;
    this.lastHudEmitKey = '';
    this.hitstopTimer = 0;
    this.goalFlashP1 = 0;
    this.goalFlashP2 = 0;
    this.speedSyncAccumulator = 0;
    this.phaseBeforePause = 'active';
    this.cameraController.setShake(0);
    this.physics.topSpeedKmh = 0;
    this.physics.totalHits = 0;
    this.physics.resetPositions('center');
    this.vfx.clearTrail();
    this.ai.reset();
    this.clock.getDelta();

    if (config.mode === 'practice') {
      this.phase = 'active';
      this.input.setActive(true);
      this.physics.launchPracticePuck(config.practiceSpeedMultiplier);
    } else {
      this.phase = 'countdown';
      this.countdownTimer = 2.7;
      this.lastCountdownStep = 4;
      this.input.setActive(false);
    }
    this.syncPaddleControlModes();
    this.pushHUD(true);
  }

  public enterIdleMenu(): void {
    this.cinematic.stage = 'none';
    this.phase = 'idle';
    this.phaseBeforePause = 'active';
    this.winningGoalPending = false;
    this.hitstopTimer = 0;
    this.goalFlashP1 = 0;
    this.goalFlashP2 = 0;
    this.cameraController.setShake(0);
    this.sceneObjects.goalLightP1.intensity = 0;
    this.sceneObjects.goalLightP2.intensity = 0;
    this.input.setActive(false);
    this.syncPaddleControlModes();
    this.physics.resetPositions('center');
    this.vfx.clearTrail();
    this.pushHUD(true);
  }

  public pauseMatch(): void {
    if (
      this.phase === 'active' ||
      this.phase === 'countdown' ||
      this.phase === 'goal_pause'
    ) {
      this.phaseBeforePause = this.phase;
      this.phase = 'paused';
      this.input.setActive(false);
      this.syncPaddleControlModes();
      this.pushHUD(true);
    }
  }

  public resumeMatch(): void {
    if (this.phase === 'paused') {
      this.phase = this.phaseBeforePause;
      this.input.setActive(this.phase === 'active');
      this.syncPaddleControlModes();
      this.clock.getDelta();
      this.pushHUD(true);
    }
  }

  private syncPaddleControlModes(): void {
    const activePlay = this.phase === 'active';
    this.physics.setPaddleDirectControl(1, activePlay);
    this.physics.setPaddleDirectControl(
      2,
      activePlay && this.config.mode === 'two_player'
    );
  }

  private vibrate(pattern: number | number[]): void {
    if (!this.prefs.vibrationEnabled) return;
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function'
    ) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore on unsupported browsers
      }
    }
  }

  public resetPracticePuck(speedMultiplier?: number): void {
    if (speedMultiplier !== undefined) {
      this.config.practiceSpeedMultiplier = speedMultiplier;
    }
    this.physics.speedScale = this.config.practiceSpeedMultiplier;
    this.vfx.clearTrail();
    this.physics.launchPracticePuck(this.config.practiceSpeedMultiplier);
  }

  public setPracticeSparring(enabled: boolean): void {
    this.practiceSparring = enabled;
    if (!enabled) {
      this.physics.setPaddleTarget(2, 0, -(HALF_LENGTH - 0.24));
    }
  }

  public getPracticeSparring(): boolean {
    return this.practiceSparring;
  }

  private handleGoalScored(scorer: 1 | 2, puckSpeedKmh: number): void {
    if (this.phase !== 'active') return;

    this.lastGoalScorer = scorer === 1 ? 'p1' : 'p2';
    this.lastGoalSpeedKmh = puckSpeedKmh;
    this.audio.playGoal(scorer === 1);
    this.vibrate([35, 30, 50]);

    if (scorer === 1) {
      this.score1++;
      this.goalFlashP2 = 1.0;
      this.vfx.spawnGoalBurst(-HALF_LENGTH, 1);
      this.pendingServe = 'p2';
    } else {
      this.score2++;
      this.goalFlashP1 = 1.0;
      this.vfx.spawnGoalBurst(HALF_LENGTH, 2);
      this.pendingServe = 'p1';
    }

    if (!this.prefs.reducedMotion) {
      this.cameraController.setShake(0.024);
    }

    const winTarget =
      this.config.mode !== 'practice' && this.config.winningScore > 0
        ? this.config.winningScore
        : 0;
    this.winningGoalPending =
      winTarget > 0 &&
      (this.score1 >= winTarget || this.score2 >= winTarget);

    this.phase = 'goal_pause';
    this.goalPauseTimer = this.winningGoalPending ? 1.1 : 1.45;
    this.input.setActive(false);
    this.syncPaddleControlModes();
    this.pushHUD(true);
  }

  private finishMatch(): void {
    this.phase = 'finished';
    this.winningGoalPending = false;
    this.input.setActive(false);
    this.syncPaddleControlModes();
    if (this.score1 > this.score2) this.winner = 'p1';
    else if (this.score2 > this.score1) this.winner = 'p2';
    else this.winner = 'draw';

    this.audio.playVictory();
    const hud = this.buildHUDState();
    this.lastHudEmitKey = '';
    this.callbacks.onHUDUpdate(hud);
    this.callbacks.onMatchFinished(hud);
  }

  private buildHUDState(): LiveMatchHUDState {
    return {
      matchId: this.matchId,
      phase: this.phase,
      score1: this.score1,
      score2: this.score2,
      remainingSeconds: Math.max(0, Math.ceil(this.remainingSeconds)),
      countdownValue: Math.max(0, Math.ceil(this.countdownTimer)),
      lastGoalScorer: this.lastGoalScorer,
      lastGoalSpeedKmh: this.lastGoalSpeedKmh,
      topSpeedKmh: this.physics.topSpeedKmh,
      totalHits: this.physics.totalHits,
      puckSpeedKmh: this.physics.getPuckSpeedKmh(),
      winner: this.winner,
    };
  }

  private pushHUD(force = false): void {
    const rem = Math.max(0, Math.ceil(this.remainingSeconds));
    const cd = Math.max(0, Math.ceil(this.countdownTimer));
    const key = `${this.matchId}|${this.phase}|${this.score1}|${this.score2}|${rem}|${cd}|${this.lastGoalScorer}|${this.winner}`;
    if (!force && key === this.lastHudEmitKey) return;
    this.lastHudEmitKey = key;
    this.callbacks.onHUDUpdate(this.buildHUDState());
  }

  private updateSize(): void {
    if (this.disposed) return;
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    this.cameraController.setAspect(width, height);
    this.renderer.setSize(width, height, false);
    this.input.updateRect();
  }

  private tick = (): void => {
    if (this.disposed) return;
    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    this.elapsedTime += dt;

    if (this.phase === 'cinematic') {
      this.cinematic.update(dt, this.physics, this.vfx, this.audio);
    } else if (this.phase === 'countdown') {
      this.countdownTimer -= dt;
      const step = Math.ceil(this.countdownTimer);
      if (step !== this.lastCountdownStep && step >= 0) {
        this.lastCountdownStep = step;
        if (step >= 1 && step <= 3) {
          this.audio.playCountdown(false);
          this.pushHUD();
        }
      }
      if (this.countdownTimer <= 0) {
        this.phase = 'active';
        this.audio.playCountdown(true);
        this.input.setActive(true);
        this.syncPaddleControlModes();
        this.pushHUD(true);
      }
    } else if (this.phase === 'active') {
      if (this.hitstopTimer > 0) {
        this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      } else {
        this.input.updateKeyboard(dt);
        if (this.config.mode === 'vs_ai') {
          this.ai.update(this.physics, dt);
        } else if (this.config.mode === 'practice' && this.practiceSparring) {
          this.ai.update(this.physics, dt);
        }
        this.physics.step(dt);
      }

      if (this.config.mode !== 'practice') {
        this.remainingSeconds -= dt;
        if (this.remainingSeconds <= 0) {
          this.remainingSeconds = 0;
          this.finishMatch();
        }
      }

      // Only emit React HUD state updates on discrete second/score/phase changes (zero idle re-renders)
      this.pushHUD(false);

      this.speedSyncAccumulator += dt;
      if (this.speedSyncAccumulator >= 0.08) {
        this.speedSyncAccumulator = 0;
        this.callbacks.onSpeedUpdate?.(
          this.physics.getPuckSpeedKmh(),
          this.physics.topSpeedKmh
        );
      }
    } else if (this.phase === 'goal_pause') {
      this.physics.step(dt);
      this.goalPauseTimer -= dt;
      if (this.goalPauseTimer <= 0) {
        if (this.winningGoalPending) {
          this.finishMatch();
        } else {
          this.vfx.clearTrail();
          if (this.config.mode === 'practice') {
            this.physics.resetPositions('center');
            this.physics.launchPracticePuck(this.config.practiceSpeedMultiplier);
          } else {
            this.physics.resetPositions(this.pendingServe);
          }
          this.phase = 'active';
          this.input.setActive(true);
          this.syncPaddleControlModes();
          this.pushHUD(true);
        }
      }
    }

    // Sync 3D transforms & animated striker cosmetics
    const p = this.physics.puck;
    this.sceneObjects.puckGroup.position.set(p.x, SURFACE_Y, p.z);
    this.sceneObjects.puckGroup.rotation.y += p.spin * dt;
    const puckSpd = Math.hypot(p.vx, p.vz);
    this.sceneObjects.puckGlowMat.emissiveIntensity =
      0.55 + Math.min(0.95, puckSpd * 0.16);

    this.sceneObjects.paddle1Group.position.set(
      this.physics.p1.x,
      SURFACE_Y,
      this.physics.p1.z
    );
    this.sceneObjects.paddle2Group.position.set(
      this.physics.p2.x,
      SURFACE_Y,
      this.physics.p2.z
    );
    this.sceneObjects.updateCosmetics(this.elapsedTime, dt);

    if (this.goalFlashP1 > 0) {
      this.goalFlashP1 = Math.max(0, this.goalFlashP1 - dt * 1.4);
    }
    if (this.goalFlashP2 > 0) {
      this.goalFlashP2 = Math.max(0, this.goalFlashP2 - dt * 1.4);
    }
    this.sceneObjects.goalLightP1.intensity = this.goalFlashP1 * 5.0;
    this.sceneObjects.goalLightP2.intensity = this.goalFlashP2 * 5.0;
    this.sceneObjects.goalStripP1Mat.emissiveIntensity = 1.6 + this.goalFlashP1 * 3.2;
    this.sceneObjects.goalStripP2Mat.emissiveIntensity = 1.6 + this.goalFlashP2 * 3.2;

    this.vfx.update(dt, p.x, p.z, puckSpd);
    this.cameraController.update({
      dt,
      phase: this.phase,
      cinematicStage: this.cinematic.stage,
      cinematicTimer: this.cinematic.timer,
      puckX: p.x,
      puckZ: p.z,
      cameraView: this.prefs.cameraView,
      reducedMotion: this.prefs.reducedMotion,
    });

    this.renderer.render(this.scene, this.cameraController.camera);

    if (this.isSoftwareGl) {
      this.frameIsTimer = true;
      scheduleAfterDraw(
        this.renderer.getContext() as WebGL2RenderingContext | null,
        () => this.disposed,
        (id) => {
          this.frameId = id;
        },
        this.tick
      );
    } else {
      this.frameIsTimer = false;
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private startLoop(): void {
    if (this.isSoftwareGl) {
      this.frameIsTimer = true;
      scheduleAfterDraw(
        this.renderer.getContext() as WebGL2RenderingContext | null,
        () => this.disposed,
        (id) => {
          this.frameId = id;
        },
        this.tick
      );
    } else {
      this.frameIsTimer = false;
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private cancelScheduledFrame(): void {
    if (this.frameIsTimer) {
      window.clearTimeout(this.frameId);
    } else {
      cancelAnimationFrame(this.frameId);
    }
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.cancelScheduledFrame();
    this.callbacks.onContextLost?.();
  };

  private handleContextRestored = (): void => {
    this.callbacks.onContextRestored?.();
    this.clock.start();
    this.startLoop();
  };

  public getPuckNormalizedScreenInfo(): { speedKmh: number } {
    return {
      speedKmh: Math.round(
        Math.hypot(this.physics.puck.vx, this.physics.puck.vz) * SPEED_TO_KMH
      ),
    };
  }

  public dispose(): void {
    this.disposed = true;
    this.cancelScheduledFrame();
    this.resizeObserver.disconnect();
    this.input.dispose();
    this.vfx.dispose();
    this.audio.dispose();
    this.sceneObjects.dispose();

    const canvas = this.renderer.domElement;
    canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.renderer.dispose();
    if (canvas.parentNode === this.container) {
      this.container.removeChild(canvas);
    }
  }
}
