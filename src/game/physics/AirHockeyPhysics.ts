import {
  CENTER_DIVIDER_MARGIN,
  CORNER_RADIUS,
  FIXED_DT,
  GOAL_DEPTH,
  GOAL_HALF_WIDTH,
  HALF_LENGTH,
  HALF_WIDTH,
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
}

export interface PhysicsEvents {
  onPaddleHit?: (
    player: 1 | 2,
    x: number,
    z: number,
    impactSpeed: number
  ) => void;
  onWallHit?: (x: number, z: number, impactSpeed: number) => void;
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
  };

  public speedScale = 1.0;
  public topSpeedKmh = 0;
  public totalHits = 0;

  private accumulator = 0;
  private stuckTimer = 0;
  private lastWallSoundTime = 0;
  private lastPaddleSoundTime = { 1: 0, 2: 0 };
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
    this.goalTriggered = false;
  }

  public launchPracticePuck(speedMultiplier: number): void {
    const clampedScale = Math.max(0.5, Math.min(2.0, Number.isFinite(speedMultiplier) ? speedMultiplier : 1.0));
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

  public setPaddleTarget(player: 1 | 2, tx: number, tz: number): void {
    const pad = player === 1 ? this.p1 : this.p2;
    const clamped = this.clampPaddleCoords(tx, tz, pad);
    pad.targetX = clamped.x;
    pad.targetZ = clamped.z;
  }

  public nudgePaddleTarget(player: 1 | 2, dx: number, dz: number): void {
    const pad = player === 1 ? this.p1 : this.p2;
    this.setPaddleTarget(player, pad.targetX + dx, pad.targetZ + dz);
  }

  public step(rawDt: number): void {
    const dt = Math.min(rawDt, MAX_FRAME_DT);
    this.accumulator += dt;

    let substeps = 0;
    const maxSubsteps = 16;
    while (this.accumulator >= FIXED_DT && substeps < maxSubsteps) {
      this.stepFixed(FIXED_DT);
      this.accumulator -= FIXED_DT;
      substeps++;
    }
    if (substeps >= maxSubsteps) {
      this.accumulator = 0;
    }
  }

  public getPuckSpeedKmh(): number {
    const speed = Math.hypot(this.puck.vx, this.puck.vz);
    return Math.round(speed * SPEED_TO_KMH);
  }

  private stepFixed(dt: number): void {
    this.simTime += dt;

    this.updatePaddle(this.p1, dt);
    this.updatePaddle(this.p2, dt);

    if (this.goalTriggered) {
      this.puck.x += this.puck.vx * dt;
      this.puck.z += this.puck.vz * dt;
      const damp = Math.exp(-6.0 * dt);
      this.puck.vx *= damp;
      this.puck.vz *= damp;
      const maxPocketX = GOAL_HALF_WIDTH - this.puck.radius;
      if (this.puck.x < -maxPocketX) {
        this.puck.x = -maxPocketX;
        this.puck.vx = Math.abs(this.puck.vx) * 0.4;
      } else if (this.puck.x > maxPocketX) {
        this.puck.x = maxPocketX;
        this.puck.vx = -Math.abs(this.puck.vx) * 0.4;
      }
      const maxPocketZ = HALF_LENGTH + GOAL_DEPTH - this.puck.radius;
      if (this.puck.z > maxPocketZ) {
        this.puck.z = maxPocketZ;
        this.puck.vz = -Math.abs(this.puck.vz) * 0.3;
      } else if (this.puck.z < -maxPocketZ) {
        this.puck.z = -maxPocketZ;
        this.puck.vz = Math.abs(this.puck.vz) * 0.3;
      }
      return;
    }

    this.puck.x += this.puck.vx * dt;
    this.puck.z += this.puck.vz * dt;

    const drag = Math.exp(-PUCK_AIR_DRAG * dt);
    this.puck.vx *= drag;
    this.puck.vz *= drag;
    this.puck.spin *= Math.exp(-1.5 * dt);

    this.resolvePaddleCollision(this.p1, 1);
    this.resolvePaddleCollision(this.p2, 2);
    this.resolveTableCollisions();
    this.resolvePaddleCollision(this.p1, 1);
    this.resolvePaddleCollision(this.p2, 2);
    this.resolveTableCollisions();

    const maxSpd =
      MAX_PUCK_SPEED * Math.max(0.75, Math.min(1.5, this.speedScale));
    const spd = Math.hypot(this.puck.vx, this.puck.vz);
    if (spd > maxSpd) {
      const ratio = maxSpd / spd;
      this.puck.vx *= ratio;
      this.puck.vz *= ratio;
    } else if (spd < 0.008) {
      this.puck.vx = 0;
      this.puck.vz = 0;
    }

    const kmh = Math.round(Math.min(spd, maxSpd) * SPEED_TO_KMH);
    if (kmh > this.topSpeedKmh) {
      this.topSpeedKmh = kmh;
    }

    const nearBoundary =
      Math.abs(this.puck.x) > HALF_WIDTH - this.puck.radius - 0.02 ||
      Math.abs(this.puck.z) > HALF_LENGTH - this.puck.radius - 0.02;
    if (nearBoundary && spd < 0.06) {
      this.stuckTimer += dt;
      if (this.stuckTimer > 1.6) {
        const toCenterX = -this.puck.x;
        const toCenterZ = -this.puck.z;
        const len = Math.hypot(toCenterX, toCenterZ) || 1;
        this.puck.vx += (toCenterX / len) * 0.85;
        this.puck.vz += (toCenterZ / len) * 0.85;
        this.stuckTimer = 0;
      }
    } else {
      this.stuckTimer = 0;
    }

    if (Math.abs(this.puck.x) < GOAL_HALF_WIDTH - this.puck.radius * 0.15) {
      if (this.puck.z < -(HALF_LENGTH + this.puck.radius * 0.45)) {
        this.goalTriggered = true;
        this.events.onGoal?.(1, kmh);
      } else if (this.puck.z > HALF_LENGTH + this.puck.radius * 0.45) {
        this.goalTriggered = true;
        this.events.onGoal?.(2, kmh);
      }
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

  private updatePaddle(pad: PaddleBody, dt: number): void {
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
      MAX_PADDLE_SPEED * Math.max(0.85, Math.min(1.25, this.speedScale));
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

  private resolvePaddleCollision(pad: PaddleBody, player: 1 | 2): void {
    const dx = this.puck.x - pad.x;
    const dz = this.puck.z - pad.z;
    const distSq = dx * dx + dz * dz;
    const minDist = this.puck.radius + pad.radius;

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
    this.puck.x += nx * (penetration + 0.0005);
    this.puck.z += nz * (penetration + 0.0005);

    const rvx = this.puck.vx - pad.vx;
    const rvz = this.puck.vz - pad.vz;
    const relVelAlongNormal = rvx * nx + rvz * nz;

    if (relVelAlongNormal < 0) {
      const e = PADDLE_RESTITUTION;
      const invM1 = 1 / this.puck.mass;
      const invM2 = 1 / pad.mass;
      const j = (-(1 + e) * relVelAlongNormal) / (invM1 + invM2);

      const impulse = j * invM1;
      this.puck.vx += impulse * nx;
      this.puck.vz += impulse * nz;

      const tx = -nz;
      const tz = nx;
      const relTangential = rvx * tx + rvz * tz;
      this.puck.vx -= relTangential * 0.06 * tx;
      this.puck.vz -= relTangential * 0.06 * tz;
      this.puck.spin = Math.max(
        -25,
        Math.min(25, this.puck.spin + relTangential * 3.5)
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

  private resolveTableCollisions(): void {
    const r = this.puck.radius;
    let bounced = false;
    let hitX = this.puck.x;
    let hitZ = this.puck.z;
    let impactSpeed = 0;

    let handledCorner = false;
    for (const c of CORNER_CENTERS) {
      const inCornerX = c.sx < 0 ? this.puck.x < c.cx : this.puck.x > c.cx;
      const inCornerZ = c.sz < 0 ? this.puck.z < c.cz : this.puck.z > c.cz;
      if (inCornerX && inCornerZ) {
        const dx = this.puck.x - c.cx;
        const dz = this.puck.z - c.cz;
        const dist = Math.hypot(dx, dz);
        const maxDist = CORNER_RADIUS - r;
        if (dist > maxDist && dist > 1e-6) {
          const nx = -dx / dist;
          const nz = -dz / dist;
          this.puck.x = c.cx - nx * maxDist;
          this.puck.z = c.cz - nz * maxDist;
          const vn = this.puck.vx * nx + this.puck.vz * nz;
          if (vn < 0) {
            this.puck.vx -= (1 + WALL_RESTITUTION) * vn * nx;
            this.puck.vz -= (1 + WALL_RESTITUTION) * vn * nz;
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
      if (this.puck.x < -HALF_WIDTH + r) {
        this.puck.x = -HALF_WIDTH + r;
        if (this.puck.vx < 0) {
          impactSpeed = Math.max(impactSpeed, Math.abs(this.puck.vx));
          this.puck.vx = -this.puck.vx * WALL_RESTITUTION;
          hitX = -HALF_WIDTH;
          hitZ = this.puck.z;
          bounced = true;
        }
      } else if (this.puck.x > HALF_WIDTH - r) {
        this.puck.x = HALF_WIDTH - r;
        if (this.puck.vx > 0) {
          impactSpeed = Math.max(impactSpeed, Math.abs(this.puck.vx));
          this.puck.vx = -this.puck.vx * WALL_RESTITUTION;
          hitX = HALF_WIDTH;
          hitZ = this.puck.z;
          bounced = true;
        }
      }
    }

    const postRadius = 0.012;
    for (const post of GOAL_POSTS) {
      const dx = this.puck.x - post.x;
      const dz = this.puck.z - post.z;
      const minD = r + postRadius;
      const distSq = dx * dx + dz * dz;
      if (distSq < minD * minD && distSq > 1e-8) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const nz = dz / dist;
        this.puck.x = post.x + nx * minD;
        this.puck.z = post.z + nz * minD;
        const vn = this.puck.vx * nx + this.puck.vz * nz;
        if (vn < 0) {
          this.puck.vx -= (1 + WALL_RESTITUTION) * vn * nx;
          this.puck.vz -= (1 + WALL_RESTITUTION) * vn * nz;
          impactSpeed = Math.max(impactSpeed, Math.abs(vn));
          hitX = post.x;
          hitZ = post.z;
          bounced = true;
        }
      }
    }

    if (!handledCorner && Math.abs(this.puck.x) >= GOAL_HALF_WIDTH) {
      if (this.puck.z < -HALF_LENGTH + r) {
        this.puck.z = -HALF_LENGTH + r;
        if (this.puck.vz < 0) {
          impactSpeed = Math.max(impactSpeed, Math.abs(this.puck.vz));
          this.puck.vz = -this.puck.vz * WALL_RESTITUTION;
          hitX = this.puck.x;
          hitZ = -HALF_LENGTH;
          bounced = true;
        }
      } else if (this.puck.z > HALF_LENGTH - r) {
        this.puck.z = HALF_LENGTH - r;
        if (this.puck.vz > 0) {
          impactSpeed = Math.max(impactSpeed, Math.abs(this.puck.vz));
          this.puck.vz = -this.puck.vz * WALL_RESTITUTION;
          hitX = this.puck.x;
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
