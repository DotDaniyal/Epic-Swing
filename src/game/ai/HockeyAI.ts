import * as THREE from 'three';
import {
  CENTER_DIVIDER_MARGIN,
  GOAL_HALF_WIDTH,
  HALF_LENGTH,
  HALF_WIDTH,
  PADDLE_RADIUS,
} from '@/game/constants/arena';
import type { AirHockeyPhysics } from '@/game/physics/AirHockeyPhysics';
import type { AIDifficulty } from '@/types/game';

export interface AIProfile {
  reactionInterval: number;
  maxSpeedFactor: number;
  predictionTime: number;
  aggression: number;
  aimJitter: number;
  steeringDamp: number;
}

export const AI_DIFFICULTY_PROFILES: Record<AIDifficulty, AIProfile> = {
  easy: {
    reactionInterval: 0.15,
    maxSpeedFactor: 0.52,
    predictionTime: 0.08,
    aggression: 0.38,
    aimJitter: 0.075,
    steeringDamp: 10,
  },
  medium: {
    reactionInterval: 0.07,
    maxSpeedFactor: 0.78,
    predictionTime: 0.22,
    aggression: 0.66,
    aimJitter: 0.032,
    steeringDamp: 14,
  },
  hard: {
    reactionInterval: 0.025,
    maxSpeedFactor: 1.0,
    predictionTime: 0.38,
    aggression: 0.88,
    aimJitter: 0.01,
    steeringDamp: 18,
  },
  expert: {
    reactionInterval: 0.012,
    maxSpeedFactor: 1.24,
    predictionTime: 0.52,
    aggression: 1.0,
    aimJitter: 0.003,
    steeringDamp: 24,
  },
};

export class HockeyAI {
  private difficulty: AIDifficulty = 'medium';
  private timer = 0;
  private targetX = 0;
  private targetZ = -(HALF_LENGTH - 0.32);
  private smoothX = 0;
  private smoothZ = -(HALF_LENGTH - 0.32);
  private jitterOffset = 0;
  private attackCooldown = 0;

  public setDifficulty(diff: AIDifficulty): void {
    this.difficulty = diff;
    this.reset();
  }

  public getDifficulty(): AIDifficulty {
    return this.difficulty;
  }

  public reset(): void {
    this.timer = 0;
    this.attackCooldown = 0;
    this.targetX = 0;
    this.targetZ = -(HALF_LENGTH - 0.32);
    this.smoothX = 0;
    this.smoothZ = -(HALF_LENGTH - 0.32);
    this.jitterOffset = 0;
  }

  public update(physics: AirHockeyPhysics, dt: number): void {
    const profile = AI_DIFFICULTY_PROFILES[this.difficulty];
    this.timer += dt;
    if (this.attackCooldown > 0) {
      this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    }

    if (this.timer >= profile.reactionInterval) {
      this.timer = 0;
      this.jitterOffset = (Math.random() - 0.5) * 2 * profile.aimJitter;
      this.computeDecision(physics, profile);
    }

    this.smoothX = THREE.MathUtils.damp(
      this.smoothX,
      this.targetX,
      profile.steeringDamp,
      dt
    );
    this.smoothZ = THREE.MathUtils.damp(
      this.smoothZ,
      this.targetZ,
      profile.steeringDamp,
      dt
    );

    const p2 = physics.p2;
    const dx = this.smoothX - p2.x;
    const dz = this.smoothZ - p2.z;
    const dist = Math.hypot(dx, dz);
    const maxStep = 6.4 * profile.maxSpeedFactor * dt;

    if (dist <= maxStep || dist < 1e-5) {
      physics.setPaddleTarget(2, this.smoothX, this.smoothZ);
    } else {
      physics.setPaddleTarget(
        2,
        p2.x + (dx / dist) * maxStep,
        p2.z + (dz / dist) * maxStep
      );
    }
  }

  private computeDecision(physics: AirHockeyPhysics, profile: AIProfile): void {
    const puck = physics.puck;
    const p2 = physics.p2;
    const p1 = physics.p1;

    const homeZ = -(HALF_LENGTH - 0.28);
    const maxReachZ = -(PADDLE_RADIUS + CENTER_DIVIDER_MARGIN + 0.04);
    const minReachZ = -(HALF_LENGTH - PADDLE_RADIUS - 0.03);

    let predX = puck.x + puck.vx * profile.predictionTime;
    const predZ = puck.z + puck.vz * profile.predictionTime;
    const boundX = HALF_WIDTH - puck.radius;
    if (predX > boundX) predX = boundX - (predX - boundX);
    if (predX < -boundX) predX = -boundX - (predX + boundX);

    const puckInAIHalf = puck.z < 0.05;
    const puckBehindAI = puck.z < p2.z - 0.03;

    // Rescue puck tucked near AI's own goal line without knocking it into own goal
    if (puckBehindAI && Math.abs(puck.x) < GOAL_HALF_WIDTH + 0.16) {
      const side = puck.x >= 0 ? -1 : 1;
      this.targetX = puck.x + side * (PADDLE_RADIUS + puck.radius + 0.06);
      this.targetZ = Math.max(minReachZ, puck.z - 0.10);
      return;
    }

    // Defensive intercept against fast incoming shots
    if (puck.vz < -0.45 && puck.z > -(HALF_LENGTH - 0.18)) {
      const defenseZ = Math.max(
        minReachZ,
        Math.min(homeZ + 0.24, puck.z - 0.14)
      );
      const tToDef = Math.min(0.65, Math.max(0, (defenseZ - puck.z) / puck.vz));
      let interceptX = puck.x + puck.vx * tToDef;
      if (interceptX > boundX) interceptX = boundX - (interceptX - boundX);
      if (interceptX < -boundX) interceptX = -boundX - (interceptX + boundX);

      const maxDefX = GOAL_HALF_WIDTH + 0.24;
      this.targetX =
        Math.max(-maxDefX, Math.min(maxDefX, interceptX)) + this.jitterOffset;
      this.targetZ = defenseZ;
      return;
    }

    // Offensive setup & strike when puck enters AI half
    if (puckInAIHalf && this.attackCooldown <= 0) {
      // On hard/expert, aim away from Player 1's current horizontal position for sharper strikes
      const smartAimX =
        profile.aggression >= 0.85
          ? p1.x > 0
            ? -0.11
            : 0.11
          : puck.x > 0
          ? -0.08
          : 0.08;
      const aimGoalX = smartAimX + this.jitterOffset;
      const aimGoalZ = HALF_LENGTH;
      const toGoalX = aimGoalX - predX;
      const toGoalZ = aimGoalZ - predZ;
      const len = Math.hypot(toGoalX, toGoalZ) || 1;
      const dirX = toGoalX / len;
      const dirZ = toGoalZ / len;

      const distToPuck = Math.hypot(p2.x - predX, p2.z - predZ);
      const puckSpeed = Math.hypot(puck.vx, puck.vz);

      if (distToPuck < 0.24 && puckSpeed < 2.5 && p2.z < predZ + 0.02) {
        this.targetX = predX + dirX * 0.11;
        this.targetZ = Math.min(maxReachZ, predZ + dirZ * 0.18);
        if (Math.random() < 0.24) {
          this.attackCooldown = 0.16 * Math.max(0.15, 1.2 - profile.aggression);
        }
      } else {
        const standOff = 0.12;
        this.targetX = predX - dirX * standOff + this.jitterOffset;
        this.targetZ = Math.max(
          minReachZ,
          Math.min(maxReachZ, predZ - dirZ * standOff)
        );
      }
      return;
    }

    // Centered goal guard stance when puck is on player side
    const guardSpan = GOAL_HALF_WIDTH * 0.88;
    const desiredX = Math.max(-guardSpan, Math.min(guardSpan, predX * 0.56));
    this.targetX = desiredX + this.jitterOffset * 0.5;
    this.targetZ = homeZ;
  }
}
