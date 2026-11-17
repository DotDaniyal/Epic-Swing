import {
  CENTER_DIVIDER_MARGIN,
  CORNER_RADIUS,
  FIXED_DT,
  GOAL_DEPTH,
  GOAL_HALF_WIDTH,
  HALF_LENGTH,
  HALF_WIDTH,
  MAX_DIRECT_STRIKE_SPEED,
  MAX_FRAME_DT,
  MAX_PADDLE_SPEED,
  MAX_PUCK_SPEED,
  PADDLE_MASS,
  PADDLE_RADIUS,
  PADDLE_RESTITUTION,
  PUCK_AIR_DRAG,
  PUCK_MASS,
  PUCK_RADIUS,
  SPEED_TO_KMH,
  WALL_RESTITUTION,
} from '@/game/constants/arena';

export interface Body2D {
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  mass: number;
}

export interface PaddleBody extends Body2D {
  targetX: number;
  targetZ: number;
  minZ: number;
  maxZ: number;
  directControl: boolean;
}

export interface PhysicsEvents {
  onPaddleHit?: (
    player: 1 | 2,
    x: number,
    z: number,
    impactSpeed: number
  ) => void;
  onWallHit?: (x: number, z: number, impactSpeed: number) => void;
  onShieldHit?: (defender: 1 | 2, x: number, z: number) => void;
  onGoal?: (scorer: 1 | 2, puckSpeedKmh: number) => void;
}

const GOAL_POSTS: ReadonlyArray<{ x: number; z: number }> = [
  { x: -GOAL_HALF_WIDTH, z: -HALF_LENGTH },
  { x: GOAL_HALF_WIDTH, z: -HALF_LENGTH },
  { x: -GOAL_HALF_WIDTH, z: HALF_LENGTH },
  { x: GOAL_HALF_WIDTH, z: HALF_LENGTH },
];

const CORNER_CENTERS: ReadonlyArray<{
  cx: number;
  cz: number;
  sx: number;
  sz: number;
}> = [
  { cx: -HALF_WIDTH + CORNER_RADIUS, cz: -HALF_LENGTH + CORNER_RADIUS, sx: -1, sz: -1 },
  { cx: HALF_WIDTH - CORNER_RADIUS, cz: -HALF_LENGTH + CORNER_RADIUS, sx: 1, sz: -1 },
  { cx: -HALF_WIDTH + CORNER_RADIUS, cz: HALF_LENGTH - CORNER_RADIUS, sx: -1, sz: 1 },
  { cx: HALF_WIDTH - CORNER_RADIUS, cz: HALF_LENGTH - CORNER_RADIUS, sx: 1, sz: 1 },
];

interface PaddleSubstepPlan {
  direct: boolean;
  stepDx: number;
  stepDz: number;
  velX: number;
  velZ: number;
}

export class AirHockeyPhysics {
  public puck: Body2D & { spin: number } = {
    x: 0,
    z: 0,
    vx: 0,
    vz: 0,
    radius: PUCK_RADIUS,
    mass: PUCK_MASS,
    spin: 0,
  };

  public bonusPuck: Body2D & { active: boolean; spin: number } = {
    active: false,
    x: 0,
    z: 0,
    vx: 0,
    vz: 0,
    radius: PUCK_RADIUS,
    mass: PUCK_MASS,
    spin: 0,
  };

  public p1: PaddleBody = {
    x: 0,
    z: HALF_LENGTH - 0.34,
    vx: 0,
    vz: 0,
    radius: PADDLE_RADIUS,
    mass: PADDLE_MASS,
    targetX: 0,
    targetZ: HALF_LENGTH - 0.34,
    minZ: PADDLE_RADIUS + CENTER_DIVIDER_MARGIN,
    maxZ: HALF_LENGTH - PADDLE_RADIUS - 0.01,
    directControl: false,
  };

  public p2: PaddleBody = {
    x: 0,
    z: -(HALF_LENGTH - 0.34),
    vx: 0,
    vz: 0,
    radius: PADDLE_RADIUS,
    mass: PADDLE_MASS,
    targetX: 0,
    targetZ: -(HALF_LENGTH - 0.34),
    minZ: -(HALF_LENGTH - PADDLE_RADIUS - 0.01),
    maxZ: -(PADDLE_RADIUS + CENTER_DIVIDER_MARGIN),
    directControl: false,
  };

  public speedScale = 1.0;
  public puckTimeScale = 1.0;
  public strikeBoost1 = 1.0;
  public strikeBoost2 = 1.0;
  public aiStrikePower = 0.55;
  public goalShield1 = false;
  public goalShield2 = false;
  public topSpeedKmh = 0;
  public totalHits = 0;

  private accumulator = 0;
  private stuckTimer = 0;
  private lastWallSoundTime = -1;
  private lastPaddleSoundTime = { 1: -1, 2: -1 };
  private simTime = 0;
  private goalTriggered = false;
  private events: PhysicsEvents;

  constructor(events: PhysicsEvents = {}) {
    this.events = events;
    this.resetPositions('center');
  }

  public setEvents(events: PhysicsEvents): void {
    this.events = events;
  }

  public resetPowerUpModifiers(): void {
    this.puckTimeScale = 1.0;
    this.strikeBoost1 = 1.0;
    this.strikeBoost2 = 1.0;
    this.aiStrikePower = 0.55;
    this.goalShield1 = false;
    this.goalShield2 = false;
    this.bonusPuck.active = false;
    this.bonusPuck.vx = 0;
    this.bonusPuck.vz = 0;
    this.setPaddleRadiusScale(1, 1.0);
    this.setPaddleRadiusScale(2, 1.0);
  }

  public setPaddleRadiusScale(player: 1 | 2, scale: number): void {
    const safeScale = Math.max(0.85, Math.min(1.45, Number.isFinite(scale) ? scale : 1.0));
    const pad = player === 1 ? this.p1 : this.p2;
    pad.radius = PADDLE_RADIUS * safeScale;
    if (player === 1) {
      pad.minZ = pad.radius + CENTER_DIVIDER_MARGIN;
      pad.maxZ = HALF_LENGTH - pad.radius - 0.01;
    } else {
      pad.minZ = -(HALF_LENGTH - pad.radius - 0.01);
      pad.maxZ = -(pad.radius + CENTER_DIVIDER_MARGIN);
    }
    const clamped = this.clampPaddleCoords(pad.x, pad.z, pad);
    pad.x = clamped.x;
    pad.z = clamped.z;
    const clampedTarget = this.clampPaddleCoords(pad.targetX, pad.targetZ, pad);
    pad.targetX = clampedTarget.x;
    pad.targetZ = clampedTarget.z;
  }

  public activateBonusPuck(): void {
    this.bonusPuck.active = true;
    this.bonusPuck.x = this.puck.x >= 0 ? -0.14 : 0.14;
    this.bonusPuck.z = 0;
    const dirZ = Math.random() < 0.5 ? 1 : -1;
    const dirX = this.bonusPuck.x < 0 ? 1 : -1;
    this.bonusPuck.vx = dirX * 1.9;
    this.bonusPuck.vz = dirZ * 2.4;
    this.bonusPuck.spin = 4;
  }

  public deactivateBonusPuck(): void {
    this.bonusPuck.active = false;
    this.bonusPuck.vx = 0;
    this.bonusPuck.vz = 0;
  }

  public getPrimaryThreatPuck(): Body2D & { spin: number } {
    if (!this.bonusPuck.active) return this.puck;
    // Threat metric for AI: closer to AI goal (smaller z) and incoming negative vz
    const scoreMain = -this.puck.z + (this.puck.vz < -0.3 ? 0.55 : 0);
    const scoreBonus = -this.bonusPuck.z + (this.bonusPuck.vz < -0.3 ? 0.55 : 0);
    return scoreBonus > scoreMain ? this.bonusPuck : this.puck;
  }

  public resetPositions(serveTo: 'center' | 'p1' | 'p2' = 'center'): void {
    this.puck.x = 0;
    this.puck.vx = 0;
    this.puck.vz = 0;
    this.puck.spin = 0;

    if (serveTo === 'p1') {
      this.puck.z = 0.24;
    } else if (serveTo === 'p2') {
      this.puck.z = -0.24;
    } else {
      this.puck.z = 0;
    }

    this.bonusPuck.active = false;
    this.bonusPuck.x = 0;
    this.bonusPuck.z = 0;
    this.bonusPuck.vx = 0;
    this.bonusPuck.vz = 0;
    this.bonusPuck.spin = 0;

    this.p1.x = 0;
    this.p1.z = HALF_LENGTH - 0.34;
    this.p1.vx = 0;
    this.p1.vz = 0;
    this.p1.targetX = 0;
    this.p1.targetZ = HALF_LENGTH - 0.34;

    this.p2.x = 0;
    this.p2.z = -(HALF_LENGTH - 0.34);
    this.p2.vx = 0;
    this.p2.vz = 0;
    this.p2.targetX = 0;
    this.p2.targetZ = -(HALF_LENGTH - 0.34);

    this.accumulator = 0;
    this.stuckTimer = 0;
    this.lastWallSoundTime = -1;
    this.lastPaddleSoundTime = { 1: -1, 2: -1 };
    this.goalTriggered = false;
    this.aiStrikePower = 0.55;
  }

  public launchPracticePuck(speedMultiplier: number): void {
    const clampedScale = Math.max(
      0.5,
      Math.min(2.0, Number.isFinite(speedMultiplier) ? speedMultiplier : 1.0)
    );
    this.speedScale = clampedScale;
    this.puck.x = (Math.random() - 0.5) * 0.16;
    this.puck.z = -0.35;
    const angle = (Math.random() - 0.5) * 0.9;
    const baseSpeed = 2.6 * clampedScale;
    this.puck.vx = Math.sin(angle) * baseSpeed;
    this.puck.vz = Math.cos(angle) * baseSpeed;
    this.goalTriggered = false;
    this.stuckTimer = 0;
  }

  public setPaddleDirectControl(player: 1 | 2, enabled: boolean): void {
    const pad = player === 1 ? this.p1 : this.p2;
    pad.directControl = enabled;
  }

  public setPaddleTarget(player: 1 | 2, tx: number, tz: number): void {
    const pad = player === 1 ? this.p1 : this.p2;
    const clamped = this.clampPaddleCoords(tx, tz, pad);
    pad.targetX = clamped.x;
    pad.targetZ = clamped.z;
  }

  /**
   * Immediately repositions the striker to the touch coordinate (e.g., on pointerdown)
   * with zero phantom velocity while gently separating from active pucks if touching on top.
   */
  public snapPaddleTo(player: 1 | 2, tx: number, tz: number): void {
    const pad = player === 1 ? this.p1 : this.p2;
    const clamped = this.clampPaddleCoords(tx, tz, pad);
    pad.x = clamped.x;
    pad.z = clamped.z;
    pad.targetX = clamped.x;
    pad.targetZ = clamped.z;
    pad.vx = 0;
    pad.vz = 0;

    this.separatePaddleFromPuckOnSnap(pad, player, this.puck);
    if (this.bonusPuck.active) {
      this.separatePaddleFromPuckOnSnap(pad, player, this.bonusPuck);
    }
  }

  private separatePaddleFromPuckOnSnap(
    pad: PaddleBody,
    player: 1 | 2,
    puck: Body2D & { spin: number }
  ): void {
    const dx = puck.x - pad.x;
    const dz = puck.z - pad.z;
    const minDist = puck.radius + pad.radius;
    const distSq = dx * dx + dz * dz;
    if (distSq < minDist * minDist) {
      const dist = Math.sqrt(distSq);
      const nx = dist > 1e-6 ? dx / dist : 0;
      const nz = dist > 1e-6 ? dz / dist : player === 1 ? -1 : 1;
      const overlap = minDist - dist + 0.001;
      puck.x += nx * overlap;
      puck.z += nz * overlap;
      this.resolveTableCollisionsForPuck(puck);
    }
  }

  public nudgePaddleTarget(player: 1 | 2, dx: number, dz: number): void {
    const pad = player === 1 ? this.p1 : this.p2;
    this.setPaddleTarget(player, pad.targetX + dx, pad.targetZ + dz);
  }

  private createSubstepPlan(
    pad: PaddleBody,
    substeps: number,
    totalFrameDt: number,
    strikeBoost: number
  ): PaddleSubstepPlan {
    if (!pad.directControl || substeps <= 0 || totalFrameDt <= 0) {
      return { direct: false, stepDx: 0, stepDz: 0, velX: 0, velZ: 0 };
    }
    const clamped = this.clampPaddleCoords(pad.targetX, pad.targetZ, pad);
    const dx = clamped.x - pad.x;
    const dz = clamped.z - pad.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1e-6) {
      return { direct: true, stepDx: 0, stepDz: 0, velX: 0, velZ: 0 };
    }

    const rawVelX = dx / totalFrameDt;
    const rawVelZ = dz / totalFrameDt;
    const rawSpeed = Math.hypot(rawVelX, rawVelZ);
    const maxStrike =
      MAX_DIRECT_STRIKE_SPEED *
      Math.max(0.82, Math.min(1.35, this.speedScale)) *
      strikeBoost;

    let velX = rawVelX;
    let velZ = rawVelZ;
    if (rawSpeed > maxStrike) {
      const ratio = maxStrike / rawSpeed;
      velX *= ratio;
      velZ *= ratio;
    }

    return {
      direct: true,
      stepDx: dx / substeps,
      stepDz: dz / substeps,
      velX,
      velZ,
    };
  }

  public step(rawDt: number): void {
    const dt = Math.min(Math.max(0, rawDt), MAX_FRAME_DT);
    this.accumulator += dt;

    const maxSubsteps = 16;
    const plannedSubsteps = Math.min(
      maxSubsteps,
      Math.floor(this.accumulator / FIXED_DT)
    );

    if (plannedSubsteps === 0) {
      if (this.p1.directControl) {
        const clamped = this.clampPaddleCoords(this.p1.targetX, this.p1.targetZ, this.p1);
        this.p1.x = clamped.x;
        this.p1.z = clamped.z;
      }
      if (this.p2.directControl) {
        const clamped = this.clampPaddleCoords(this.p2.targetX, this.p2.targetZ, this.p2);
        this.p2.x = clamped.x;
        this.p2.z = clamped.z;
      }
      return;
    }

    const activeSpanDt = plannedSubsteps * FIXED_DT;
    const plan1 = this.createSubstepPlan(
      this.p1,
      plannedSubsteps,
      activeSpanDt,
      this.strikeBoost1
    );
    const plan2 = this.createSubstepPlan(
      this.p2,
      plannedSubsteps,
      activeSpanDt,
      this.strikeBoost2
    );

    for (let i = 0; i < plannedSubsteps; i++) {
      this.stepFixed(FIXED_DT, plan1, plan2);
      this.accumulator -= FIXED_DT;
    }
    if (plannedSubsteps >= maxSubsteps) {
      this.accumulator = 0;
    }
  }

  public getPuckSpeedKmh(): number {
    const speed = Math.hypot(this.puck.vx, this.puck.vz);
    return Math.round(speed * SPEED_TO_KMH);
  }

  private stepFixed(
    dt: number,
    plan1: PaddleSubstepPlan,
    plan2: PaddleSubstepPlan
  ): void {
    this.simTime += dt;

    this.updatePaddle(this.p1, dt, plan1, this.strikeBoost1);
    this.updatePaddle(this.p2, dt, plan2, this.strikeBoost2);

    if (this.goalTriggered) {
      this.dampGoalPocketPuck(this.puck, dt);
      if (this.bonusPuck.active) {
        this.dampGoalPocketPuck(this.bonusPuck, dt);
      }
      return;
    }

    const puckDt = dt * Math.max(0.45, Math.min(1.5, this.puckTimeScale));
    this.advanceAndResolvePuck(this.puck, puckDt, dt, false);

    if (!this.goalTriggered && this.bonusPuck.active) {
      this.advanceAndResolvePuck(this.bonusPuck, puckDt, dt, true);
      this.resolvePuckPairCollision(this.puck, this.bonusPuck);
      this.resolveTableCollisionsForPuck(this.puck);
      this.resolveTableCollisionsForPuck(this.bonusPuck);
    }
  }

  private dampGoalPocketPuck(
    puck: Body2D & { spin: number },
    dt: number
  ): void {
    puck.x += puck.vx * dt;
    puck.z += puck.vz * dt;
    const damp = Math.exp(-6.0 * dt);
    puck.vx *= damp;
    puck.vz *= damp;
    const maxPocketX = GOAL_HALF_WIDTH - puck.radius;
    if (puck.x < -maxPocketX) {
      puck.x = -maxPocketX;
      puck.vx = Math.abs(puck.vx) * 0.4;
    } else if (puck.x > maxPocketX) {
      puck.x = maxPocketX;
      puck.vx = -Math.abs(puck.vx) * 0.4;
    }
    const maxPocketZ = HALF_LENGTH + GOAL_DEPTH - puck.radius;
    if (puck.z > maxPocketZ) {
      puck.z = maxPocketZ;
      puck.vz = -Math.abs(puck.vz) * 0.3;
    } else if (puck.z < -maxPocketZ) {
      puck.z = -maxPocketZ;
      puck.vz = Math.abs(puck.vz) * 0.3;
    }
  }

  private advanceAndResolvePuck(
    puck: Body2D & { spin: number },
    puckDt: number,
    realDt: number,
    isBonus: boolean
  ): void {
    puck.x += puck.vx * puckDt;
    puck.z += puck.vz * puckDt;

    const drag = Math.exp(-PUCK_AIR_DRAG * puckDt);
    puck.vx *= drag;
    puck.vz *= drag;
    puck.spin *= Math.exp(-1.5 * puckDt);

    this.resolvePaddleCollisionForPuck(puck, this.p1, 1);
    this.resolvePaddleCollisionForPuck(puck, this.p2, 2);
    this.resolveTableCollisionsForPuck(puck);
    this.resolvePaddleCollisionForPuck(puck, this.p1, 1);
    this.resolvePaddleCollisionForPuck(puck, this.p2, 2);
    this.resolveTableCollisionsForPuck(puck);

    const maxSpd =
      MAX_PUCK_SPEED * Math.max(0.75, Math.min(1.5, this.speedScale));
    const spd = Math.hypot(puck.vx, puck.vz);
    if (spd > maxSpd) {
      const ratio = maxSpd / spd;
      puck.vx *= ratio;
      puck.vz *= ratio;
    } else if (spd < 0.008) {
      puck.vx = 0;
      puck.vz = 0;
    }

    const kmh = Math.round(Math.min(spd, maxSpd) * SPEED_TO_KMH);
    if (kmh > this.topSpeedKmh) {
      this.topSpeedKmh = kmh;
    }

    if (!isBonus) {
      const nearBoundary =
        Math.abs(puck.x) > HALF_WIDTH - puck.radius - 0.02 ||
        Math.abs(puck.z) > HALF_LENGTH - puck.radius - 0.02;
      if (nearBoundary && spd < 0.06) {
        this.stuckTimer += realDt;
        if (this.stuckTimer > 1.4) {
          const toCenterX = -puck.x;
          const toCenterZ = -puck.z;
          const len = Math.hypot(toCenterX, toCenterZ) || 1;
          puck.vx += (toCenterX / len) * 0.9;
          puck.vz += (toCenterZ / len) * 0.9;
          this.stuckTimer = 0;
        }
      } else {
        this.stuckTimer = 0;
      }
    }

    // Clean, immediate goal line detection across the goal opening
    if (!this.goalTriggered && Math.abs(puck.x) <= GOAL_HALF_WIDTH) {
      if (puck.z <= -HALF_LENGTH) {
        this.goalTriggered = true;
        this.events.onGoal?.(1, kmh);
      } else if (puck.z >= HALF_LENGTH) {
        this.goalTriggered = true;
        this.events.onGoal?.(2, kmh);
      }
    }
  }

  private resolvePuckPairCollision(
    a: Body2D & { spin: number },
    b: Body2D & { spin: number }
  ): void {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const minDist = a.radius + b.radius;
    const distSq = dx * dx + dz * dz;
    if (distSq >= minDist * minDist || distSq < 1e-8) return;

    const dist = Math.sqrt(distSq);
    const nx = dx / dist;
    const nz = dz / dist;
    const overlap = (minDist - dist) * 0.5 + 0.0004;
    a.x -= nx * overlap;
    a.z -= nz * overlap;
    b.x += nx * overlap;
    b.z += nz * overlap;

    const rvx = b.vx - a.vx;
    const rvz = b.vz - a.vz;
    const relVn = rvx * nx + rvz * nz;
    if (relVn < 0) {
      const restitution = 0.92;
      const impulse = (-(1 + restitution) * relVn) / 2;
      a.vx -= impulse * nx;
      a.vz -= impulse * nz;
      b.vx += impulse * nx;
      b.vz += impulse * nz;
    }
  }

  private clampPaddleCoords(
    tx: number,
    tz: number,
    pad: PaddleBody
  ): { x: number; z: number } {
    const r = pad.radius;
    let x = Math.max(-(HALF_WIDTH - r), Math.min(HALF_WIDTH - r, tx));
    let z = Math.max(pad.minZ, Math.min(pad.maxZ, tz));

    for (const c of CORNER_CENTERS) {
      const inCornerX = c.sx < 0 ? x < c.cx : x > c.cx;
      const inCornerZ = c.sz < 0 ? z < c.cz : z > c.cz;
      if (inCornerX && inCornerZ) {
        const dx = x - c.cx;
        const dz = z - c.cz;
        const dist = Math.hypot(dx, dz);
        const maxDist = CORNER_RADIUS - r;
        if (dist > maxDist && dist > 1e-6) {
          x = c.cx + (dx / dist) * maxDist;
          z = c.cz + (dz / dist) * maxDist;
        }
      }
    }
    return { x, z };
  }

  private updatePaddle(
    pad: PaddleBody,
    dt: number,
    plan: PaddleSubstepPlan,
    strikeBoost: number
  ): void {
    if (plan.direct) {
      pad.x += plan.stepDx;
      pad.z += plan.stepDz;
      pad.vx = plan.velX;
      pad.vz = plan.velZ;
      const postClamp = this.clampPaddleCoords(pad.x, pad.z, pad);
      pad.x = postClamp.x;
      pad.z = postClamp.z;
      return;
    }

    const clamped = this.clampPaddleCoords(pad.targetX, pad.targetZ, pad);
    const dx = clamped.x - pad.x;
    const dz = clamped.z - pad.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 1e-6) {
      pad.vx = 0;
      pad.vz = 0;
      return;
    }

    const desiredSpeed = dist / dt;
    const maxSpeed =
      MAX_PADDLE_SPEED *
      Math.max(0.82, Math.min(1.35, this.speedScale)) *
      strikeBoost;
    if (desiredSpeed <= maxSpeed) {
      pad.vx = dx / dt;
      pad.vz = dz / dt;
      pad.x = clamped.x;
      pad.z = clamped.z;
    } else {
      const nx = dx / dist;
      const nz = dz / dist;
      pad.vx = nx * maxSpeed;
      pad.vz = nz * maxSpeed;
      pad.x += pad.vx * dt;
      pad.z += pad.vz * dt;
    }

    const postClamp = this.clampPaddleCoords(pad.x, pad.z, pad);
    pad.x = postClamp.x;
    pad.z = postClamp.z;
  }

  private resolvePaddleCollisionForPuck(
    puck: Body2D & { spin: number },
    pad: PaddleBody,
    player: 1 | 2
  ): void {
    const dx = puck.x - pad.x;
    const dz = puck.z - pad.z;
    const distSq = dx * dx + dz * dz;
    const minDist = puck.radius + pad.radius;

    if (distSq >= minDist * minDist) return;

    let dist = Math.sqrt(distSq);
    let nx: number;
    let nz: number;
    if (dist < 1e-6) {
      nx = 0;
      nz = player === 1 ? -1 : 1;
      dist = 0;
    } else {
      nx = dx / dist;
      nz = dz / dist;
    }

    const penetration = minDist - dist;
    puck.x += nx * (penetration + 0.0005);
    puck.z += nz * (penetration + 0.0005);

    const pinnedSide = Math.abs(puck.x) >= HALF_WIDTH - puck.radius - 0.003;
    const pinnedEnd =
      Math.abs(puck.z) >= HALF_LENGTH - puck.radius - 0.003 &&
      Math.abs(puck.x) >= GOAL_HALF_WIDTH;
    if (pinnedSide) {
      const escapeDirZ = player === 1 ? -1 : 1;
      puck.vz += escapeDirZ * 0.45;
      puck.vx += (puck.x > 0 ? -1 : 1) * 0.3;
    } else if (pinnedEnd) {
      puck.vx += (puck.x > 0 ? -1 : 1) * 0.45;
    }

    const rvx = puck.vx - pad.vx;
    const rvz = puck.vz - pad.vz;
    const relVelAlongNormal = rvx * nx + rvz * nz;

    if (relVelAlongNormal < 0) {
      const boost = player === 1 ? this.strikeBoost1 : this.strikeBoost2;
      const power = player === 2 ? this.aiStrikePower : 1.0;
      const e = PADDLE_RESTITUTION * (boost > 1 ? 1.12 : 1.0);
      const invM1 = 1 / puck.mass;
      const invM2 = 1 / pad.mass;
      const j = (-(1 + e) * relVelAlongNormal) / (invM1 + invM2);

      const impulse = j * invM1 * power;
      puck.vx += impulse * nx;
      puck.vz += impulse * nz;

      if (player === 2) {
        const aiLaunchSpd = Math.hypot(puck.vx, puck.vz);
        const maxAiLaunch = 3.65 * Math.max(0.85, this.strikeBoost2);
        if (aiLaunchSpd > maxAiLaunch) {
          const ratio = maxAiLaunch / aiLaunchSpd;
          puck.vx *= ratio;
          puck.vz *= ratio;
        }
      }

      const tx = -nz;
      const tz = nx;
      const relTangential = rvx * tx + rvz * tz;
      puck.vx -= relTangential * 0.06 * tx;
      puck.vz -= relTangential * 0.06 * tz;
      puck.spin = Math.max(
        -25,
        Math.min(25, puck.spin + relTangential * 3.5)
      );

      const impactSpeed = Math.abs(relVelAlongNormal);
      if (
        impactSpeed > 0.25 &&
        this.simTime - this.lastPaddleSoundTime[player] > 0.045
      ) {
        this.lastPaddleSoundTime[player] = this.simTime;
        this.totalHits++;
        this.events.onPaddleHit?.(
          player,
          pad.x + nx * pad.radius,
          pad.z + nz * pad.radius,
          impactSpeed
        );
      }
    }
  }

  private resolveTableCollisionsForPuck(puck: Body2D & { spin: number }): void {
    const r = puck.radius;
    let bounced = false;
    let hitX = puck.x;
    let hitZ = puck.z;
    let impactSpeed = 0;

    let handledCorner = false;
    for (const c of CORNER_CENTERS) {
      const inCornerX = c.sx < 0 ? puck.x < c.cx : puck.x > c.cx;
      const inCornerZ = c.sz < 0 ? puck.z < c.cz : puck.z > c.cz;
      if (inCornerX && inCornerZ) {
        const dx = puck.x - c.cx;
        const dz = puck.z - c.cz;
        const dist = Math.hypot(dx, dz);
        const maxDist = CORNER_RADIUS - r;
        if (dist > maxDist && dist > 1e-6) {
          const nx = -dx / dist;
          const nz = -dz / dist;
          puck.x = c.cx - nx * maxDist;
          puck.z = c.cz - nz * maxDist;
          const vn = puck.vx * nx + puck.vz * nz;
          if (vn < 0) {
            puck.vx -= (1 + WALL_RESTITUTION) * vn * nx;
            puck.vz -= (1 + WALL_RESTITUTION) * vn * nz;
            impactSpeed = Math.max(impactSpeed, Math.abs(vn));
            hitX = c.cx - nx * CORNER_RADIUS;
            hitZ = c.cz - nz * CORNER_RADIUS;
            bounced = true;
          }
        }
        handledCorner = true;
        break;
      }
    }

    if (!handledCorner) {
      if (puck.x < -HALF_WIDTH + r) {
        puck.x = -HALF_WIDTH + r;
        if (puck.vx < 0) {
          impactSpeed = Math.max(impactSpeed, Math.abs(puck.vx));
          puck.vx = -puck.vx * WALL_RESTITUTION;
          hitX = -HALF_WIDTH;
          hitZ = puck.z;
          bounced = true;
        }
      } else if (puck.x > HALF_WIDTH - r) {
        puck.x = HALF_WIDTH - r;
        if (puck.vx > 0) {
          impactSpeed = Math.max(impactSpeed, Math.abs(puck.vx));
          puck.vx = -puck.vx * WALL_RESTITUTION;
          hitX = HALF_WIDTH;
          hitZ = puck.z;
          bounced = true;
        }
      }
    }

    // Active Goal Shields block pucks right across the goal mouth line
    if (!handledCorner && Math.abs(puck.x) < GOAL_HALF_WIDTH) {
      if (this.goalShield2 && puck.z < -HALF_LENGTH + r + 0.01 && puck.z > -HALF_LENGTH - r) {
        puck.z = -HALF_LENGTH + r + 0.01;
        if (puck.vz < 0) {
          puck.vz = -puck.vz * 0.94;
          this.events.onShieldHit?.(2, puck.x, -HALF_LENGTH);
        }
      } else if (this.goalShield1 && puck.z > HALF_LENGTH - r - 0.01 && puck.z < HALF_LENGTH + r) {
        puck.z = HALF_LENGTH - r - 0.01;
        if (puck.vz > 0) {
          puck.vz = -puck.vz * 0.94;
          this.events.onShieldHit?.(1, puck.x, HALF_LENGTH);
        }
      }
    }

    const postRadius = 0.012;
    for (const post of GOAL_POSTS) {
      // Only collide with posts if the puck is on the playing field side of the goal line
      if (post.z < 0 && puck.z <= -HALF_LENGTH) continue;
      if (post.z > 0 && puck.z >= HALF_LENGTH) continue;

      const dx = puck.x - post.x;
      const dz = puck.z - post.z;
      const minD = r + postRadius;
      const distSq = dx * dx + dz * dz;
      if (distSq < minD * minD && distSq > 1e-8) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const nz = dz / dist;
        puck.x = post.x + nx * minD;
        puck.z = post.z + nz * minD;
        const vn = puck.vx * nx + puck.vz * nz;
        if (vn < 0) {
          puck.vx -= (1 + WALL_RESTITUTION) * vn * nx;
          puck.vz -= (1 + WALL_RESTITUTION) * vn * nz;
          impactSpeed = Math.max(impactSpeed, Math.abs(vn));
          hitX = post.x;
          hitZ = post.z;
          bounced = true;
        }
      }
    }

    if (Math.abs(puck.z) > HALF_LENGTH && Math.abs(puck.x) < GOAL_HALF_WIDTH) {
      const maxPocketX = GOAL_HALF_WIDTH - r;
      if (puck.x < -maxPocketX) {
        puck.x = -maxPocketX;
        if (puck.vx < 0) puck.vx = -puck.vx * 0.65;
      } else if (puck.x > maxPocketX) {
        puck.x = maxPocketX;
        if (puck.vx > 0) puck.vx = -puck.vx * 0.65;
      }
    }

    if (!handledCorner && Math.abs(puck.x) >= GOAL_HALF_WIDTH) {
      if (puck.z < -HALF_LENGTH + r) {
        puck.z = -HALF_LENGTH + r;
        if (puck.vz < 0) {
          impactSpeed = Math.max(impactSpeed, Math.abs(puck.vz));
          puck.vz = -puck.vz * WALL_RESTITUTION;
          hitX = puck.x;
          hitZ = -HALF_LENGTH;
          bounced = true;
        }
      } else if (puck.z > HALF_LENGTH - r) {
        puck.z = HALF_LENGTH - r;
        if (puck.vz > 0) {
          impactSpeed = Math.max(impactSpeed, Math.abs(puck.vz));
          puck.vz = -puck.vz * WALL_RESTITUTION;
          hitX = puck.x;
          hitZ = HALF_LENGTH;
          bounced = true;
        }
      }
    }

    if (
      bounced &&
      impactSpeed > 0.3 &&
      this.simTime - this.lastWallSoundTime > 0.04
    ) {
      this.lastWallSoundTime = this.simTime;
      this.events.onWallHit?.(hitX, hitZ, impactSpeed);
    }
  }
}
