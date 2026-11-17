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

export type AIBehaviorState = 'defense' | 'balanced' | 'attack' | 'recovery';
export type AIShotType = 'weak' | 'medium' | 'strong';

export interface AIProfile {
  reactionInterval: number; // In seconds (Beginner: 0.70s, Easy: 0.50s, Medium: 0.35s, Hard: 0.20s, Expert: 0.10s)
  maxSpeedFactor: number;   // ~45% of legacy values for human-like movement
  steeringDamp: number;     // ~50% of legacy responsiveness for natural acceleration
  predictionTime: number;   // Limited forward projection
  aggression: number;       // Offense frequency
  aimJitter: number;        // Aim imperfection
  defenseErrorMargin: number; // Intentional positioning gap for player scoring openings
  recoveryDelay: number;    // Cooldown pause after striking before repositioning
  attackChance: number;     // Probability to commit to an attack
}

export const AI_DIFFICULTY_PROFILES: Record<AIDifficulty, AIProfile> = {
  beginner: {
    reactionInterval: 0.70, // 700 ms
    maxSpeedFactor: 0.16,   // ~1.0 m/s max speed
    steeringDamp: 3.5,
    predictionTime: 0.0,    // No forward prediction
    aggression: 0.15,
    aimJitter: 0.14,
    defenseErrorMargin: 0.14, // Leaves wide open goal lanes
    recoveryDelay: 0.75,    // 750 ms recovery delay after striking
    attackChance: 0.35,
  },
  easy: {
    reactionInterval: 0.50, // 500 ms
    maxSpeedFactor: 0.23,   // ~1.5 m/s max speed
    steeringDamp: 4.5,
    predictionTime: 0.04,   // Minimal projection, vulnerable to bank shots
    aggression: 0.28,
    aimJitter: 0.09,
    defenseErrorMargin: 0.09, // Leaves corners open
    recoveryDelay: 0.55,    // 550 ms recovery delay
    attackChance: 0.50,
  },
  medium: {
    reactionInterval: 0.35, // 350 ms
    maxSpeedFactor: 0.35,   // ~2.2 m/s max speed
    steeringDamp: 6.5,
    predictionTime: 0.10,   // Moderate projection
    aggression: 0.48,
    aimJitter: 0.05,
    defenseErrorMargin: 0.045,
    recoveryDelay: 0.35,    // 350 ms recovery delay
    attackChance: 0.70,
  },
  hard: {
    reactionInterval: 0.20, // 200 ms
    maxSpeedFactor: 0.48,   // ~3.1 m/s max speed
    steeringDamp: 9.0,
    predictionTime: 0.18,
    aggression: 0.72,
    aimJitter: 0.02,
    defenseErrorMargin: 0.015,
    recoveryDelay: 0.20,
    attackChance: 0.88,
  },
  expert: {
    reactionInterval: 0.10, // 100 ms
    maxSpeedFactor: 0.62,   // ~4.0 m/s max speed
    steeringDamp: 12.0,
    predictionTime: 0.28,
    aggression: 0.90,
    aimJitter: 0.008,
    defenseErrorMargin: 0.0,
    recoveryDelay: 0.10,
    attackChance: 0.96,
  },
};

export class HockeyAI {
  private difficulty: AIDifficulty = 'easy';
  private state: AIBehaviorState = 'defense';
  private timer = 0;
  private recoveryTimer = 0;
  private attackCooldown = 0;
  private targetX = 0;
  private targetZ = -(HALF_LENGTH - 0.28);
  private smoothX = 0;
  private smoothZ = -(HALF_LENGTH - 0.28);
  private jitterOffset = 0;
  private defenseGapOffset = 0;
  private currentShot: {
    type: AIShotType;
    powerScale: number;
    aimVariance: number;
  } = {
    type: 'weak',
    powerScale: 0.42,
    aimVariance: 0.11,
  };

  // Dynamic game balancing (fair assist)
  private dynamicReactionMultiplier = 1.0;
  private dynamicSpeedMultiplier = 1.0;
  private dynamicGapMultiplier = 1.0;
  private dynamicAttackMultiplier = 1.0;

  public setDifficulty(diff: AIDifficulty): void {
    this.difficulty = diff;
    this.reset();
  }

  public getDifficulty(): AIDifficulty {
    return this.difficulty;
  }

  public getState(): AIBehaviorState {
    return this.state;
  }

  public getCurrentShot(): { type: AIShotType; powerScale: number } {
    return {
      type: this.currentShot.type,
      powerScale: this.currentShot.powerScale,
    };
  }

  public getDynamicReactionMultiplier(): number {
    return this.dynamicReactionMultiplier;
  }

  public reset(): void {
    this.timer = 0;
    this.recoveryTimer = 0;
    this.attackCooldown = 0;
    this.state = 'defense';
    this.targetX = 0;
    this.targetZ = -(HALF_LENGTH - 0.28);
    this.smoothX = 0;
    this.smoothZ = -(HALF_LENGTH - 0.28);
    this.jitterOffset = 0;
    this.defenseGapOffset = 0;
    this.currentShot = {
      type: 'weak',
      powerScale: 0.42,
      aimVariance: 0.11,
    };
    this.dynamicReactionMultiplier = 1.0;
    this.dynamicSpeedMultiplier = 1.0;
    this.dynamicGapMultiplier = 1.0;
    this.dynamicAttackMultiplier = 1.0;
  }

  /**
   * Fair Game Balancing: monitors player vs AI score during matches.
   * If the AI is consistently dominating, it smoothly softens reaction speed and
   * widens defensive openings so the player has fair goal-scoring opportunities.
   */
  public updateDynamicBalancing(
    playerScore: number,
    aiScore: number,
    _matchElapsedSeconds = 0
  ): void {
    const aiLead = aiScore - playerScore;
    if (aiLead > 0) {
      // AI is leading: provide breathing room and open up scoring lanes
      this.dynamicReactionMultiplier = Math.min(1.40, 1.0 + aiLead * 0.15);
      this.dynamicSpeedMultiplier = Math.max(0.75, 1.0 - aiLead * 0.08);
      this.dynamicGapMultiplier = Math.min(2.0, 1.0 + aiLead * 0.25);
      this.dynamicAttackMultiplier = Math.max(0.55, 1.0 - aiLead * 0.15);
    } else {
      this.dynamicReactionMultiplier = 1.0;
      this.dynamicSpeedMultiplier = 1.0;
      this.dynamicGapMultiplier = 1.0;
      this.dynamicAttackMultiplier = 1.0;
    }
  }

  /**
   * Selects an AI shot according to the target shot distribution:
   * Weak: 50%, Medium: 40%, Strong: 10%
   */
  private rollShot(): {
    type: AIShotType;
    powerScale: number;
    aimVariance: number;
  } {
    const roll = Math.random();
    if (roll < 0.50) {
      // 50% Weak shot: soft tap (~42% power), easy to defend
      return { type: 'weak', powerScale: 0.42, aimVariance: 0.11 };
    } else if (roll < 0.90) {
      // 40% Medium shot: controlled return (~56% power)
      return { type: 'medium', powerScale: 0.56, aimVariance: 0.055 };
    } else {
      // 10% Strong shot: firm strike (~72% power), occasional counter
      return { type: 'strong', powerScale: 0.72, aimVariance: 0.02 };
    }
  }

  public update(physics: AirHockeyPhysics, dt: number): void {
    const profile = AI_DIFFICULTY_PROFILES[this.difficulty];
    this.timer += dt;
    if (this.attackCooldown > 0) {
      this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    }
    if (this.recoveryTimer > 0) {
      this.recoveryTimer = Math.max(0, this.recoveryTimer - dt);
    }

    const effectiveReaction =
      profile.reactionInterval * this.dynamicReactionMultiplier;

    if (this.timer >= effectiveReaction) {
      this.timer = 0;
      this.jitterOffset = (Math.random() - 0.5) * 2 * profile.aimJitter;
      this.defenseGapOffset =
        (Math.random() - 0.5) *
        2 *
        profile.defenseErrorMargin *
        this.dynamicGapMultiplier;
      this.computeDecision(physics, profile);
    }

    // Natural acceleration and directional turning damping (no instant snapping)
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

    // AI movement speed: reduced to ~45% of legacy values
    const effectiveSpeedFactor =
      profile.maxSpeedFactor * this.dynamicSpeedMultiplier;
    const maxStep = 6.4 * effectiveSpeedFactor * dt;

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
    const puck = physics.getPrimaryThreatPuck();
    const p2 = physics.p2;
    const p1 = physics.p1;

    const homeZ = -(HALF_LENGTH - 0.28);
    const maxReachZ = -(PADDLE_RADIUS + CENTER_DIVIDER_MARGIN + 0.04);
    const minReachZ = -(HALF_LENGTH - PADDLE_RADIUS - 0.03);
    const balancedZ = -(HALF_LENGTH - 0.44);

    let predX = puck.x + puck.vx * profile.predictionTime;
    const predZ = puck.z + puck.vz * profile.predictionTime;
    const boundX = HALF_WIDTH - puck.radius;
    if (predX > boundX) predX = boundX - (predX - boundX);
    if (predX < -boundX) predX = -boundX - (predX + boundX);

    const puckInAIHalf = puck.z < -0.06;
    const puckBehindAI = puck.z < p2.z - 0.03;
    const distToPuck = Math.hypot(p2.x - puck.x, p2.z - puck.z);
    const puckSpeed = Math.hypot(puck.vx, puck.vz);

    // 1. RECOVERY STATE: after striking, AI must wait and retreat before attacking again
    if (this.recoveryTimer > 0) {
      this.state = 'recovery';
      this.targetZ = homeZ;
      const guardSpan = GOAL_HALF_WIDTH * 0.70;
      this.targetX =
        Math.max(-guardSpan, Math.min(guardSpan, puck.x * 0.45)) +
        this.defenseGapOffset;
      return;
    }

    // 2. Rescue puck tucked near AI's own goal line safely without scoring an own goal
    if (puckBehindAI && Math.abs(puck.x) < GOAL_HALF_WIDTH + 0.16) {
      const side = puck.x >= 0 ? -1 : 1;
      this.targetX = puck.x + side * (PADDLE_RADIUS + puck.radius + 0.06);
      this.targetZ = Math.max(minReachZ, puck.z - 0.09);
      return;
    }

    // 3. Check for transition into RECOVERY if an attack just hit the puck
    if (
      this.state === 'attack' &&
      (distToPuck < PADDLE_RADIUS + puck.radius + 0.025 ||
        puck.vz > 0.35 ||
        puck.z > 0.05)
    ) {
      this.state = 'recovery';
      this.recoveryTimer = profile.recoveryDelay;
      this.attackCooldown = profile.recoveryDelay + 0.35;
      this.targetZ = homeZ;
      return;
    }

    // 4. ATTACK STATE: controlled offense only when a genuine, reasonable opportunity exists
    const canAttack =
      puckInAIHalf &&
      puck.z > p2.z + 0.04 &&
      puckSpeed < (this.difficulty === 'beginner' ? 2.2 : this.difficulty === 'easy' ? 2.8 : 4.0) &&
      this.attackCooldown <= 0;

    if (canAttack && Math.random() < profile.attackChance * this.dynamicAttackMultiplier) {
      this.state = 'attack';
      this.currentShot = this.rollShot();
      physics.aiStrikePower = this.currentShot.powerScale;

      // Aim setup: angles vary realistically so human player can anticipate and defend
      let aimX = 0;
      if (this.difficulty === 'beginner' || this.difficulty === 'easy') {
        aimX = (Math.random() - 0.5) * 0.35 + this.currentShot.aimVariance;
      } else if (profile.aggression >= 0.85) {
        aimX = p1.x > 0 ? -0.11 : 0.11;
      } else {
        aimX = puck.x > 0 ? -0.08 : 0.08;
      }

      const toGoalX = aimX + this.jitterOffset - predX;
      const toGoalZ = HALF_LENGTH - predZ;
      const len = Math.hypot(toGoalX, toGoalZ) || 1;
      const dirX = toGoalX / len;
      const dirZ = toGoalZ / len;

      const powerRatio = this.currentShot.powerScale / 0.55;
      this.targetX = predX + dirX * 0.09 * powerRatio;
      this.targetZ = Math.min(maxReachZ, predZ + dirZ * 0.14 * powerRatio);
      return;
    }

    // 5. BALANCED STATE: when puck is loose in neutral zone, hold position without chasing wildly
    const puckInNeutralZone = puck.z >= -0.32 && puck.z <= 0.15;
    if (puckInNeutralZone) {
      this.state = 'balanced';
      const guardSpan = GOAL_HALF_WIDTH * 0.72;
      const trackX = Math.max(-guardSpan, Math.min(guardSpan, predX * 0.52));
      this.targetX = trackX + this.defenseGapOffset * 0.8;
      this.targetZ = balancedZ;
      return;
    }

    // 6. DEFENSE STATE: protect goal with human-like latency & openings
    this.state = 'defense';
    const isFastIncoming = puck.vz < -0.35 && puck.z > -(HALF_LENGTH - 0.20);

    if (isFastIncoming) {
      if (this.difficulty === 'beginner' || this.difficulty === 'easy') {
        // Beginner and Easy do NOT solve exact trajectory intercept — bank shots & angled shots pass!
        const maxDefX = GOAL_HALF_WIDTH * 0.75;
        this.targetX =
          Math.max(-maxDefX, Math.min(maxDefX, puck.x * 0.60)) +
          this.defenseGapOffset;
        this.targetZ = homeZ;
      } else {
        // Medium / Hard / Expert defensive intercept with difficulty-scaled prediction
        const defenseZ = Math.max(
          minReachZ,
          Math.min(homeZ + 0.20, puck.z - 0.12)
        );
        const tToDef = Math.min(
          0.60,
          Math.max(0, (defenseZ - puck.z) / puck.vz)
        );
        let interceptX = puck.x + puck.vx * tToDef;
        if (this.difficulty === 'medium') {
          // Medium occasionally misjudges bank bounces
          if (Math.abs(puck.vx) > 1.2 && Math.random() < 0.35) {
            interceptX = puck.x;
          }
        }
        if (interceptX > boundX) interceptX = boundX - (interceptX - boundX);
        if (interceptX < -boundX) interceptX = -boundX - (interceptX + boundX);

        const maxDefX = GOAL_HALF_WIDTH + 0.18;
        this.targetX =
          Math.max(-maxDefX, Math.min(maxDefX, interceptX)) +
          this.defenseGapOffset * 0.5;
        this.targetZ = defenseZ;
      }
      return;
    }

    // Default defensive goal guard stance when puck is in player half
    const guardSpan = GOAL_HALF_WIDTH * 0.78;
    const desiredX = Math.max(-guardSpan, Math.min(guardSpan, predX * 0.50));
    this.targetX = desiredX + this.defenseGapOffset;
    this.targetZ = homeZ;
  }
}
