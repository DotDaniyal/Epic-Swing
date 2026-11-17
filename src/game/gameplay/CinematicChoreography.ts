import type { SoundEngine } from '@/audio/SoundEngine';
import type { AirHockeyPhysics } from '@/game/physics/AirHockeyPhysics';
import type { ArenaVFX } from '@/game/vfx/ArenaVFX';

export type CinematicStage =
  | 'none'
  | 'table_reveal'
  | 'gameplay_rally'
  | 'menu_blend';

export class CinematicChoreography {
  public stage: CinematicStage = 'none';
  public timer = 0;
  private shotStep = 0;

  public startStage(
    stage: CinematicStage,
    physics: AirHockeyPhysics,
    vfx: ArenaVFX
  ): void {
    this.stage = stage;
    this.timer = 0;
    this.shotStep = 0;

    if (stage === 'none') {
      physics.resetPositions('center');
      vfx.clearTrail();
      return;
    }

    if (stage === 'table_reveal') {
      physics.resetPositions('center');
      vfx.clearTrail();
      physics.puck.x = -0.18;
      physics.puck.z = 0.08;
      physics.puck.vx = 2.6;
      physics.puck.vz = -1.9;
    } else if (stage === 'gameplay_rally') {
      physics.resetPositions('center');
      vfx.clearTrail();
      physics.p1.x = -0.18;
      physics.p1.z = 0.85;
      physics.p2.x = 0.16;
      physics.p2.z = -0.82;
      physics.puck.x = -0.05;
      physics.puck.z = 0.56;
      physics.puck.vx = 0;
      physics.puck.vz = 0;
    }
  }

  public update(
    dt: number,
    physics: AirHockeyPhysics,
    vfx: ArenaVFX,
    audio: SoundEngine
  ): void {
    this.timer += dt;

    if (this.stage === 'table_reveal') {
      physics.setPaddleTarget(1, Math.sin(this.timer * 1.4) * 0.2, 0.86);
      physics.setPaddleTarget(2, -Math.sin(this.timer * 1.4) * 0.2, -0.86);
      physics.step(dt);
      return;
    }

    if (this.stage === 'gameplay_rally') {
      const t = this.timer;
      if (t < 0.55) {
        physics.setPaddleTarget(1, -0.04, 0.48);
        physics.setPaddleTarget(2, 0.14, -0.78);
      } else if (t < 1.35) {
        if (this.shotStep === 0) {
          this.shotStep = 1;
          physics.puck.vx = 2.4;
          physics.puck.vz = -4.2;
        }
        physics.setPaddleTarget(1, 0.18, 0.78);
        physics.setPaddleTarget(2, physics.puck.x * 0.85, -0.62);
      } else if (t < 2.3) {
        if (this.shotStep === 1) {
          this.shotStep = 2;
          physics.puck.vx = -3.4;
          physics.puck.vz = 3.9;
        }
        physics.setPaddleTarget(1, -0.18, 0.72);
        physics.setPaddleTarget(2, 0.25, -0.86);
      } else {
        if (this.shotStep === 2) {
          this.shotStep = 3;
          physics.setPaddleTarget(1, -0.05, 0.44);
          physics.puck.x = -0.06;
          physics.puck.z = 0.22;
          physics.puck.vx = 0.35;
          physics.puck.vz = -5.8;
          vfx.spawnImpact(-0.06, 0.25, 1.3, 'p1');
          audio.playPaddleHit(5.2);
        }
        physics.setPaddleTarget(2, 0.38, -0.82);
      }
      physics.step(dt);
    }
  }
}
