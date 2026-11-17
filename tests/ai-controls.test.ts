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
import { formatClock, formatDurationLabel } from '@/utils/format';

export function runAIAndControlsTests(): number {
  let passed = 0;

  // 1. Difficulty profile monotonic scaling (easy -> medium -> hard -> expert)
  {
    const easy = AI_DIFFICULTY_PROFILES.easy;
    const med = AI_DIFFICULTY_PROFILES.medium;
    const hard = AI_DIFFICULTY_PROFILES.hard;
    const expert = AI_DIFFICULTY_PROFILES.expert;

    assert.ok(
      easy.reactionInterval > med.reactionInterval &&
        med.reactionInterval > hard.reactionInterval &&
        hard.reactionInterval > expert.reactionInterval,
      'Reaction interval tightens from easy -> medium -> hard -> expert'
    );
    assert.ok(
      easy.maxSpeedFactor < med.maxSpeedFactor &&
        med.maxSpeedFactor < hard.maxSpeedFactor &&
        hard.maxSpeedFactor < expert.maxSpeedFactor,
      'Max speed factor scales up from easy -> medium -> hard -> expert'
    );
    assert.ok(
      easy.aggression < med.aggression &&
        med.aggression < hard.aggression &&
        hard.aggression < expert.aggression,
      'Aggression increases from easy -> medium -> hard -> expert'
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

  return passed;
}
