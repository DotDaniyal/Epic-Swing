import assert from 'node:assert/strict';
import {
  CENTER_DIVIDER_MARGIN,
  GOAL_HALF_WIDTH,
  HALF_LENGTH,
  HALF_WIDTH,
  MAX_PUCK_SPEED,
  PADDLE_RADIUS,
  PUCK_RADIUS,
} from '@/game/constants/arena';
import { AirHockeyPhysics } from '@/game/physics/AirHockeyPhysics';

export function runPhysicsTests(): number {
  let passed = 0;

  // 1. Initial positions & serve placement
  {
    const physics = new AirHockeyPhysics();
    assert.equal(physics.puck.x, 0);
    assert.equal(physics.puck.z, 0);
    assert.ok(physics.p1.z > 0, 'P1 starts in bottom half (z > 0)');
    assert.ok(physics.p2.z < 0, 'P2 starts in top half (z < 0)');

    physics.resetPositions('p1');
    assert.ok(physics.puck.z > 0, 'Serve to P1 places puck in bottom half');
    physics.resetPositions('p2');
    assert.ok(physics.puck.z < 0, 'Serve to P2 places puck in top half');
    passed++;
  }

  // 2. Paddle bounds clamping & center-line separation
  {
    const physics = new AirHockeyPhysics();
    // Try pushing P1 across center divider into P2 zone and past right/bottom wall
    physics.setPaddleTarget(1, 5.0, -2.0);
    physics.step(1 / 60);
    assert.ok(
      physics.p1.x <= HALF_WIDTH - PADDLE_RADIUS + 1e-6,
      'P1 stays within right wall'
    );
    assert.ok(
      physics.p1.z >= PADDLE_RADIUS + CENTER_DIVIDER_MARGIN - 1e-6,
      'P1 cannot cross center divider'
    );

    // Try pushing P2 across center divider into P1 zone and past left/top wall
    physics.setPaddleTarget(2, -5.0, 2.0);
    physics.step(1 / 60);
    assert.ok(
      physics.p2.x >= -(HALF_WIDTH - PADDLE_RADIUS) - 1e-6,
      'P2 stays within left wall'
    );
    assert.ok(
      physics.p2.z <= -(PADDLE_RADIUS + CENTER_DIVIDER_MARGIN) + 1e-6,
      'P2 cannot cross center divider'
    );
    passed++;
  }

  // 3. Paddle-puck collision momentum transfer & hit callback
  {
    let hitCount = 0;
    let lastPlayer: 1 | 2 | null = null;
    const physics = new AirHockeyPhysics({
      onPaddleHit: (player) => {
        hitCount++;
        lastPlayer = player;
      },
    });
    physics.resetPositions('center');
    physics.puck.x = 0;
    physics.puck.z = 0.45;
    physics.p1.x = 0;
    physics.p1.z = 0.72;
    physics.setPaddleTarget(1, 0, 0.35);

    for (let i = 0; i < 4; i++) {
      physics.step(1 / 60);
    }

    assert.ok(physics.puck.vz < -0.5, 'Puck accelerated toward top half after P1 strike');
    assert.ok(hitCount >= 1, 'onPaddleHit fired on impact');
    assert.equal(lastPlayer, 1, 'P1 recorded as hitting player');
    assert.ok(
      Math.hypot(physics.puck.vx, physics.puck.vz) <= MAX_PUCK_SPEED + 1e-4,
      'Puck speed clamped to MAX_PUCK_SPEED'
    );
    passed++;
  }

  // 4. Side wall bounce restitution & callback
  {
    let wallHits = 0;
    const physics = new AirHockeyPhysics({
      onWallHit: () => {
        wallHits++;
      },
    });
    physics.resetPositions('center');
    physics.puck.x = HALF_WIDTH - PUCK_RADIUS - 0.25;
    physics.puck.z = 0;
    physics.puck.vx = 3.0;
    physics.puck.vz = 0;

    for (let i = 0; i < 12; i++) {
      physics.step(1 / 60);
    }

    assert.ok(physics.puck.vx < 0, 'Puck bounced off right wall');
    assert.ok(physics.puck.x <= HALF_WIDTH - PUCK_RADIUS + 1e-4, 'Puck remains inside right wall');
    assert.ok(wallHits >= 1, 'onWallHit fired');
    passed++;
  }

  // 5. Goal scoring detection for both P1 (top goal) and P2 (bottom goal)
  {
    let scoredBy: 1 | 2 | null = null;
    const physics = new AirHockeyPhysics({
      onGoal: (scorer) => {
        scoredBy = scorer;
      },
    });

    // Top goal (z < -HALF_LENGTH) scores for P1
    physics.resetPositions('center');
    physics.puck.x = 0;
    physics.puck.z = -HALF_LENGTH + 0.04;
    physics.puck.vz = -4.0;
    for (let i = 0; i < 12; i++) {
      physics.step(1 / 60);
    }
    assert.equal(scoredBy, 1, 'Puck entering top goal awards score to P1');

    // Bottom goal (z > HALF_LENGTH) scores for P2
    scoredBy = null;
    physics.resetPositions('center');
    physics.puck.x = 0;
    physics.puck.z = HALF_LENGTH - 0.04;
    physics.puck.vz = 4.0;
    for (let i = 0; i < 12; i++) {
      physics.step(1 / 60);
    }
    assert.equal(scoredBy, 2, 'Puck entering bottom goal awards score to P2');

    // Back wall outside goal mouth should rebound instead of scoring
    scoredBy = null;
    physics.resetPositions('center');
    physics.puck.x = GOAL_HALF_WIDTH + 0.16;
    physics.puck.z = -HALF_LENGTH + PUCK_RADIUS + 0.03;
    physics.puck.vz = -3.0;
    for (let i = 0; i < 10; i++) {
      physics.step(1 / 60);
    }
    assert.equal(scoredBy, null, 'Puck hitting back wall outside goal mouth does not score');
    assert.ok(physics.puck.vz > 0, 'Puck rebounds off back wall outside goal');
    passed++;
  }

  // 6. Practice launch applies and clamps speed scale safely
  {
    const physics = new AirHockeyPhysics();
    physics.launchPracticePuck(1.25);
    assert.equal(physics.speedScale, 1.25);
    const spd = Math.hypot(physics.puck.vx, physics.puck.vz);
    assert.ok(spd > 2.0, 'Practice puck launched with non-trivial velocity');

    physics.launchPracticePuck(10);
    assert.equal(physics.speedScale, 2.0, 'High speedMultiplier clamped to 2.0');

    physics.launchPracticePuck(0.1);
    assert.equal(physics.speedScale, 0.5, 'Low speedMultiplier clamped to 0.5');

    physics.launchPracticePuck(Number.NaN);
    assert.equal(physics.speedScale, 1.0, 'NaN speedMultiplier falls back to 1.0');
    passed++;
  }

  // 7. Paddle pinning puck against side rail keeps puck inside table bounds
  {
    const physics = new AirHockeyPhysics();
    physics.resetPositions('center');
    physics.puck.x = HALF_WIDTH - PUCK_RADIUS - 0.005;
    physics.puck.z = 0.45;
    physics.puck.vx = 0;
    physics.puck.vz = 0;

    physics.p1.x = physics.puck.x - PADDLE_RADIUS - 0.01;
    physics.p1.z = 0.45;
    // Drive P1 hard rightward into the puck against the right wall
    physics.setPaddleTarget(1, HALF_WIDTH, 0.45);
    for (let i = 0; i < 6; i++) {
      physics.step(1 / 60);
    }

    assert.ok(
      physics.puck.x <= HALF_WIDTH - PUCK_RADIUS + 1e-4,
      'Puck pinned against right rail remains strictly inside table bounds'
    );
    passed++;
  }

  // 8. Direct 1:1 finger-to-striker control has zero trailing lag within a single frame
  {
    const physics = new AirHockeyPhysics();
    physics.resetPositions('center');
    physics.setPaddleDirectControl(1, true);
    physics.snapPaddleTo(1, 0, 0.72);
    assert.equal(physics.p1.vx, 0);
    assert.equal(physics.p1.vz, 0);

    // Move target sharply by 0.25m in a single 1/60s frame
    physics.setPaddleTarget(1, 0.25, 0.52);
    physics.step(1 / 60);

    assert.ok(
      Math.hypot(physics.p1.x - 0.25, physics.p1.z - 0.52) < 1e-6,
      'Direct-controlled striker lands on exact target coordinate in one frame (zero trailing lag)'
    );

    // Sub-frame lock (>240Hz dt) also keeps direct paddle locked to finger target
    physics.setPaddleTarget(1, -0.1, 0.6);
    physics.step(1 / 480);
    assert.ok(
      Math.hypot(physics.p1.x - -0.1, physics.p1.z - 0.6) < 1e-6,
      'Sub-frame step keeps direct striker glued to finger target'
    );
    passed++;
  }

  // 9. snapPaddleTo separates cleanly without launching puck & goal pocket guides puck inside posts
  {
    const physics = new AirHockeyPhysics();
    physics.resetPositions('center');
    physics.puck.x = 0.05;
    physics.puck.z = 0.45;
    physics.puck.vx = 0;
    physics.puck.vz = 0;

    // Initial touch directly on top of puck should separate cleanly with zero explosive velocity
    physics.snapPaddleTo(1, 0.05, 0.45);
    const sepDist = Math.hypot(
      physics.puck.x - physics.p1.x,
      physics.puck.z - physics.p1.z
    );
    assert.ok(
      sepDist >= PADDLE_RADIUS + PUCK_RADIUS - 1e-4,
      'snapPaddleTo separates overlapping puck and paddle'
    );
    assert.equal(
      Math.hypot(physics.puck.vx, physics.puck.vz),
      0,
      'snapPaddleTo does not impart phantom velocity to puck'
    );

    // Puck entering goal pocket keeps X inside goal post width
    physics.resetPositions('center');
    physics.puck.x = GOAL_HALF_WIDTH - PUCK_RADIUS * 0.2;
    physics.puck.z = -HALF_LENGTH - 0.01;
    physics.puck.vx = 1.2;
    physics.puck.vz = -1.5;
    physics.step(1 / 60);
    assert.ok(
      Math.abs(physics.puck.x) <= GOAL_HALF_WIDTH - PUCK_RADIUS + 1e-4,
      'Puck inside goal mouth is contained cleanly within goal post side walls'
    );
    passed++;
  }

  return passed;
}
