import assert from 'node:assert/strict';
import {
  AI_DIFFICULTY_PROFILES,
  HockeyAI,
} from '@/game/ai/HockeyAI';
import {
  CENTER_DIVIDER_MARGIN,
  HALF_LENGTH,
  HALF_WIDTH,
  PADDLE_RADIUS,
} from '@/game/constants/arena';
import { AirHockeyPhysics } from '@/game/physics/AirHockeyPhysics';
import {
  getIntroLifecyclePhase,
  hasSessionIntroPlayed,
  markIntroCompleted,
  transitionIntroLifecycle,
} from '@/features/introduction/introLifecycle';
import { formatClock, formatDurationLabel } from '@/utils/format';

export function runAIAndControlsTests(): number {
  let passed = 0;

  // 1. Difficulty profile monotonic scaling (beginner -> easy -> medium -> hard -> expert)
  {
    const beginner = AI_DIFFICULTY_PROFILES.beginner;
    const easy = AI_DIFFICULTY_PROFILES.easy;
    const med = AI_DIFFICULTY_PROFILES.medium;
    const hard = AI_DIFFICULTY_PROFILES.hard;
    const expert = AI_DIFFICULTY_PROFILES.expert;

    assert.ok(
      beginner.reactionInterval > easy.reactionInterval &&
        easy.reactionInterval > med.reactionInterval &&
        med.reactionInterval > hard.reactionInterval &&
        hard.reactionInterval > expert.reactionInterval,
      'Reaction interval tightens from beginner -> easy -> medium -> hard -> expert'
    );
    assert.ok(
      beginner.maxSpeedFactor < easy.maxSpeedFactor &&
        easy.maxSpeedFactor < med.maxSpeedFactor &&
        med.maxSpeedFactor < hard.maxSpeedFactor &&
        hard.maxSpeedFactor < expert.maxSpeedFactor,
      'Max speed factor scales up from beginner -> easy -> medium -> hard -> expert'
    );
    assert.ok(
      beginner.aggression < easy.aggression &&
        easy.aggression < med.aggression &&
        med.aggression < hard.aggression &&
        hard.aggression < expert.aggression,
      'Aggression increases from beginner -> easy -> medium -> hard -> expert'
    );
    passed++;
  }

  // 2. AI defensive guarding when puck is in P1 half
  {
    const physics = new AirHockeyPhysics();
    const ai = new HockeyAI();
    ai.setDifficulty('hard');

    physics.puck.x = 0.35;
    physics.puck.z = 0.65;
    physics.puck.vx = 0;
    physics.puck.vz = 0.5;

    for (let i = 0; i < 45; i++) {
      ai.update(physics, 1 / 60);
      physics.step(1 / 60);
    }

    assert.ok(
      physics.p2.z < -(PADDLE_RADIUS + CENTER_DIVIDER_MARGIN),
      'AI paddle remains in P2 half'
    );
    assert.ok(
      physics.p2.z < -0.5,
      'AI retreats toward defensive home zone when puck is in P1 half'
    );
    assert.ok(
      Math.abs(physics.p2.x) <= HALF_WIDTH - PADDLE_RADIUS,
      'AI target respects table X bounds'
    );
    passed++;
  }

  // 3. AI intercepts fast incoming shot in P2 half
  {
    const physics = new AirHockeyPhysics();
    const ai = new HockeyAI();
    ai.setDifficulty('hard');

    physics.puck.x = 0.18;
    physics.puck.z = -0.10;
    physics.puck.vx = 0.15;
    physics.puck.vz = -1.6;

    for (let i = 0; i < 18; i++) {
      ai.update(physics, 1 / 60);
      physics.step(1 / 60);
    }

    assert.ok(
      physics.p2.x > 0.02,
      'AI shifts horizontally toward incoming shot trajectory'
    );
    assert.ok(
      physics.p2.z >= -(HALF_LENGTH - PADDLE_RADIUS),
      'AI stays in front of back wall'
    );
    passed++;
  }

  // 4. AI resets cleanly on difficulty switch including expert tier
  {
    const physics = new AirHockeyPhysics();
    const ai = new HockeyAI();
    ai.setDifficulty('easy');
    assert.equal(ai.getDifficulty(), 'easy');
    ai.setDifficulty('expert');
    assert.equal(ai.getDifficulty(), 'expert');

    physics.puck.x = -0.15;
    physics.puck.z = -0.35;
    physics.puck.vx = 0.05;
    physics.puck.vz = -0.25;
    for (let i = 0; i < 20; i++) {
      ai.update(physics, 1 / 60);
      physics.step(1 / 60);
    }
    assert.ok(
      physics.p2.z <= -(PADDLE_RADIUS + CENTER_DIVIDER_MARGIN) &&
        Math.abs(physics.p2.x) <= HALF_WIDTH - PADDLE_RADIUS,
      'Expert AI stays cleanly clamped within its half'
    );
    passed++;
  }

  // 5. Shared time & duration format helpers
  {
    assert.equal(formatClock(0), '00:00');
    assert.equal(formatClock(65), '01:05');
    assert.equal(formatClock(-10), '00:00');
    assert.equal(formatDurationLabel(60), '1m');
    assert.equal(formatDurationLabel(90), '1m 30s');
    assert.equal(formatDurationLabel(180), '3m');
    assert.equal(formatDurationLabel(180, true), 'Unlimited');
    passed++;
  }

  // 6. AI targets highest-threat puck during Double Puck power-up
  {
    const physics = new AirHockeyPhysics();
    const ai = new HockeyAI();
    ai.setDifficulty('hard');
    physics.resetPositions('center');

    // Main puck harmless in P1 half; bonus puck fast & incoming toward AI top goal
    physics.puck.x = -0.3;
    physics.puck.z = 0.65;
    physics.puck.vx = 0;
    physics.puck.vz = 0.2;

    physics.activateBonusPuck();
    physics.bonusPuck.x = 0.24;
    physics.bonusPuck.z = -0.25;
    physics.bonusPuck.vx = 0;
    physics.bonusPuck.vz = -1.8;

    assert.equal(
      physics.getPrimaryThreatPuck(),
      physics.bonusPuck,
      'getPrimaryThreatPuck selects incoming bonus puck'
    );

    for (let i = 0; i < 16; i++) {
      ai.update(physics, 1 / 60);
      physics.step(1 / 60);
    }
    assert.ok(
      physics.p2.x > 0.03,
      'AI moves rightward toward threatening bonus puck'
    );
    passed++;
  }

  // 7. Verified AI reaction intervals matching exact user specification
  {
    assert.equal(AI_DIFFICULTY_PROFILES.beginner.reactionInterval, 0.70, 'Beginner reaction is 700 ms');
    assert.equal(AI_DIFFICULTY_PROFILES.easy.reactionInterval, 0.50, 'Easy reaction is 500 ms');
    assert.equal(AI_DIFFICULTY_PROFILES.medium.reactionInterval, 0.35, 'Medium reaction is 350 ms');
    assert.equal(AI_DIFFICULTY_PROFILES.hard.reactionInterval, 0.20, 'Hard reaction is 200 ms');
    assert.equal(AI_DIFFICULTY_PROFILES.expert.reactionInterval, 0.10, 'Expert reaction is 100 ms');
    passed++;
  }

  // 8. Verified AI speed and acceleration scaling (~45% speed, ~50% acceleration)
  {
    assert.ok(AI_DIFFICULTY_PROFILES.beginner.maxSpeedFactor <= 0.18, 'Beginner speed <= 0.18');
    assert.ok(AI_DIFFICULTY_PROFILES.easy.maxSpeedFactor <= 0.25, 'Easy speed <= 0.25');
    assert.ok(AI_DIFFICULTY_PROFILES.medium.maxSpeedFactor <= 0.38, 'Medium speed <= 0.38');
    assert.ok(AI_DIFFICULTY_PROFILES.hard.maxSpeedFactor <= 0.52, 'Hard speed <= 0.52');

    assert.ok(AI_DIFFICULTY_PROFILES.beginner.steeringDamp <= 4.0, 'Beginner damp <= 4.0');
    assert.ok(AI_DIFFICULTY_PROFILES.easy.steeringDamp <= 5.0, 'Easy damp <= 5.0');
    assert.ok(AI_DIFFICULTY_PROFILES.medium.steeringDamp <= 7.0, 'Medium damp <= 7.0');
    passed++;
  }

  // 9. AI Behavior State Machine & Dynamic Fair Game Balancing
  {
    const physics = new AirHockeyPhysics();
    const ai = new HockeyAI();
    ai.setDifficulty('easy');

    // Puck in player half -> state should be defense
    physics.puck.x = 0;
    physics.puck.z = 0.50;
    ai.update(physics, 1 / 60);
    assert.equal(ai.getState(), 'defense', 'AI enters defense state when puck is in player half');

    // Puck in neutral area -> state transitions to balanced
    physics.puck.x = 0;
    physics.puck.z = -0.10;
    // Step past reaction interval (500 ms)
    for (let i = 0; i < 35; i++) {
      ai.update(physics, 1 / 60);
    }
    const stateAfterNeutral = ai.getState();
    assert.ok(
      stateAfterNeutral === 'balanced' || stateAfterNeutral === 'attack',
      'AI transitions between balanced and attack when puck enters AI half'
    );

    // Dynamic balancing: when AI leads, reaction interval increases and defense error widens
    assert.equal(ai.getDynamicReactionMultiplier(), 1.0);
    ai.updateDynamicBalancing(1, 3); // AI leads by 2 goals
    assert.ok(
      ai.getDynamicReactionMultiplier() > 1.20,
      'Dynamic balancing adds reaction delay when AI leads'
    );
    passed++;
  }

  // 10. Single Intro Lifecycle state transitions & session idempotence
  {
    assert.equal(typeof hasSessionIntroPlayed(), 'boolean');
    transitionIntroLifecycle('INTRO_PLAYING');
    assert.equal(getIntroLifecyclePhase(), 'INTRO_PLAYING');

    markIntroCompleted();
    assert.equal(hasSessionIntroPlayed(), true, 'Session intro is marked as played');
    assert.equal(getIntroLifecyclePhase(), 'MAIN_MENU', 'Lifecycle advances to MAIN_MENU');
    passed++;
  }

  return passed;
}

