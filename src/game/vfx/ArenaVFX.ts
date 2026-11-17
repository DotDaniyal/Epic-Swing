import * as THREE from 'three';
import { COLORS, SURFACE_Y } from '@/game/constants/arena';
import type { GoalEffectId, TrailEffectId } from '@/types/game';

interface SparkParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
}

interface ShockRing {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  active: boolean;
  life: number;
  maxLife: number;
  maxScale: number;
}

const SPARK_COUNT = 64;
const RING_COUNT = 8;
const TRAIL_POINTS = 14;

export class ArenaVFX {
  private sparkMesh: THREE.InstancedMesh;
  private sparks: SparkParticle[] = [];
  private rings: ShockRing[] = [];
  private trailMesh: THREE.InstancedMesh;
  private trailMat: THREE.MeshBasicMaterial;
  private trailHistory: Array<{ x: number; z: number; speed: number }> = [];
  private trailAccumulator = 0;

  private readonly dummy = new THREE.Object3D();
  private readonly colorCyan = new THREE.Color(COLORS.p1CyanBright);
  private readonly colorOrange = new THREE.Color(COLORS.p2OrangeBright);
  private readonly colorWhite = new THREE.Color(0xf8fafc);
  private readonly colorGoalFx = new THREE.Color(COLORS.p1CyanBright);

  private trailEffectId: TrailEffectId = 'silver_stream';
  private goalEffectId: GoalEffectId = 'arcade_flash';

  public enabled = true;
  public reducedMotion = false;

  constructor(scene: THREE.Scene) {
    // 1. Pooled spark particles (InstancedMesh)
    const sparkGeo = new THREE.BoxGeometry(0.011, 0.011, 0.024);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.sparkMesh = new THREE.InstancedMesh(sparkGeo, sparkMat, SPARK_COUNT);
    this.sparkMesh.frustumCulled = false;

    for (let i = 0; i < SPARK_COUNT; i++) {
      this.sparks.push({
        active: false,
        x: 0,
        y: -10,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.3,
        scale: 0,
      });
      this.dummy.position.set(0, -10, 0);
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.sparkMesh.setMatrixAt(i, this.dummy.matrix);
      this.sparkMesh.setColorAt(i, this.colorWhite);
    }
    this.sparkMesh.instanceMatrix.needsUpdate = true;
    if (this.sparkMesh.instanceColor) {
      this.sparkMesh.instanceColor.needsUpdate = true;
    }
    scene.add(this.sparkMesh);

    // 2. Pooled expanding impact rings
    const ringGeo = new THREE.RingGeometry(0.038, 0.058, 32);
    ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < RING_COUNT; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: COLORS.p1CyanBright,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.visible = false;
      mesh.position.y = SURFACE_Y + 0.004;
      scene.add(mesh);
      this.rings.push({
        mesh,
        mat,
        active: false,
        life: 0,
        maxLife: 0.28,
        maxScale: 2.4,
      });
    }

    // 3. Pooled smooth puck light trail
    const trailGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.003, 18);
    this.trailMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.trailMesh = new THREE.InstancedMesh(trailGeo, this.trailMat, TRAIL_POINTS);
    this.trailMesh.frustumCulled = false;
    for (let i = 0; i < TRAIL_POINTS; i++) {
      this.dummy.position.set(0, -10, 0);
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.trailMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.trailMesh.instanceMatrix.needsUpdate = true;
    scene.add(this.trailMesh);
  }

  public setTrailEffect(id: TrailEffectId): void {
    this.trailEffectId = id;
    if (id === 'cyan_plasma') {
      this.trailMat.color.set(0x00e5ff);
      this.trailMat.opacity = 0.34;
    } else if (id === 'solar_flare') {
      this.trailMat.color.set(0xff6b1a);
      this.trailMat.opacity = 0.36;
    } else if (id === 'void_lightning') {
      this.trailMat.color.set(0xc084fc);
      this.trailMat.opacity = 0.36;
    } else if (id === 'prismatic_pulse') {
      this.trailMat.color.set(0xfacc15);
      this.trailMat.opacity = 0.4;
    } else {
      this.trailMat.color.set(0xe0f2fe);
      this.trailMat.opacity = 0.24;
    }
  }

  public setGoalEffect(id: GoalEffectId): void {
    this.goalEffectId = id;
  }

  public spawnImpact(
    x: number,
    z: number,
    intensity: number,
    accent: 'p1' | 'p2' | 'wall' | 'goal',
    ringScale = 2.4
  ): void {
    if (!this.enabled || this.reducedMotion) return;

    const color =
      accent === 'p1'
        ? this.colorCyan
        : accent === 'p2'
        ? this.colorOrange
        : accent === 'goal'
        ? this.colorGoalFx
        : this.colorWhite;

    const ring = this.rings.find((r) => !r.active) ?? this.rings[0];
    ring.active = true;
    ring.life = 0;
    ring.maxLife = accent === 'goal' ? 0.42 : 0.24;
    ring.maxScale = ringScale;
    ring.mesh.position.set(x, SURFACE_Y + 0.005, z);
    ring.mesh.scale.setScalar(0.6);
    ring.mesh.visible = true;
    ring.mat.color.copy(color);
    ring.mat.opacity = Math.min(0.92, 0.35 + intensity * 0.4);

    const count = Math.min(16, Math.max(4, Math.round(4 + intensity * 8)));
    let spawned = 0;
    for (let i = 0; i < SPARK_COUNT && spawned < count; i++) {
      const sp = this.sparks[i];
      if (sp.active) continue;
      sp.active = true;
      sp.x = x;
      sp.y = SURFACE_Y + 0.015;
      sp.z = z;
      const angle = Math.random() * Math.PI * 2;
      const spd = (0.8 + Math.random() * 1.9) * (0.6 + intensity * 0.8);
      sp.vx = Math.cos(angle) * spd;
      sp.vy = 0.6 + Math.random() * 1.5;
      sp.vz = Math.sin(angle) * spd;
      sp.life = 0;
      sp.maxLife = 0.22 + Math.random() * 0.22;
      sp.scale = 0.65 + Math.random() * 0.75;
      this.sparkMesh.setColorAt(i, color);
      spawned++;
    }
    if (this.sparkMesh.instanceColor) {
      this.sparkMesh.instanceColor.needsUpdate = true;
    }
  }

  public spawnGoalBurst(zPos: number, scorer: 1 | 2): void {
    if (!this.enabled || this.reducedMotion) return;

    if (this.goalEffectId === 'shockwave_nova') {
      this.colorGoalFx.set(0x00e5ff);
      for (let k = 0; k < 3; k++) {
        this.spawnImpact((k - 1) * 0.11, zPos, 1.6, 'goal', 4.2);
      }
    } else if (this.goalEffectId === 'inferno_burst') {
      this.colorGoalFx.set(0xff5722);
      for (let k = 0; k < 4; k++) {
        this.spawnImpact((k - 1.5) * 0.09, zPos, 1.7, 'goal', 3.6);
      }
    } else if (this.goalEffectId === 'frost_shatter') {
      this.colorGoalFx.set(0xbae6fd);
      for (let k = 0; k < 4; k++) {
        this.spawnImpact((k - 1.5) * 0.09, zPos, 1.6, 'goal', 3.4);
      }
    } else if (this.goalEffectId === 'gold_supernova') {
      this.colorGoalFx.set(0xfacc15);
      for (let k = 0; k < 5; k++) {
        this.spawnImpact((k - 2) * 0.08, zPos, 1.85, 'goal', 4.6);
      }
    } else {
      const accent = scorer === 1 ? 'p1' : 'p2';
      for (let k = 0; k < 3; k++) {
        this.spawnImpact((k - 1) * 0.1, zPos, 1.4, accent, 2.8);
      }
    }
  }

  public clearTrail(): void {
    this.trailHistory.length = 0;
    for (let i = 0; i < TRAIL_POINTS; i++) {
      this.dummy.position.set(0, -10, 0);
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.trailMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.trailMesh.instanceMatrix.needsUpdate = true;
  }

  public update(dt: number, puckX: number, puckZ: number, puckSpeed: number): void {
    let sparkDirty = false;
    for (let i = 0; i < SPARK_COUNT; i++) {
      const sp = this.sparks[i];
      if (!sp.active) continue;
      sparkDirty = true;
      sp.life += dt;
      if (sp.life >= sp.maxLife) {
        sp.active = false;
        this.dummy.position.set(0, -10, 0);
        this.dummy.scale.setScalar(0);
        this.dummy.updateMatrix();
        this.sparkMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }
      sp.vy -= 6.5 * dt;
      sp.x += sp.vx * dt;
      sp.y = Math.max(SURFACE_Y + 0.005, sp.y + sp.vy * dt);
      sp.z += sp.vz * dt;
      const t = 1 - sp.life / sp.maxLife;
      this.dummy.position.set(sp.x, sp.y, sp.z);
      this.dummy.rotation.set(0, Math.atan2(sp.vx, sp.vz), 0);
      this.dummy.scale.setScalar(sp.scale * t);
      this.dummy.updateMatrix();
      this.sparkMesh.setMatrixAt(i, this.dummy.matrix);
    }
    if (sparkDirty) {
      this.sparkMesh.instanceMatrix.needsUpdate = true;
    }

    for (const ring of this.rings) {
      if (!ring.active) continue;
      ring.life += dt;
      const p = ring.life / ring.maxLife;
      if (p >= 1) {
        ring.active = false;
        ring.mesh.visible = false;
        continue;
      }
      const scale = 0.7 + p * ring.maxScale;
      ring.mesh.scale.setScalar(scale);
      ring.mat.opacity = (1 - p) * 0.78;
    }

    if (!this.enabled || this.reducedMotion) {
      this.trailMesh.visible = false;
      return;
    }
    this.trailMesh.visible = true;
    this.trailAccumulator += dt;
    if (this.trailAccumulator >= 0.012) {
      this.trailAccumulator = 0;
      this.trailHistory.unshift({ x: puckX, z: puckZ, speed: puckSpeed });
      if (this.trailHistory.length > TRAIL_POINTS) {
        this.trailHistory.pop();
      }
    }

    const scaleBoost = this.trailEffectId === 'silver_stream' ? 0.92 : 1.08;
    for (let i = 0; i < TRAIL_POINTS; i++) {
      const pt = this.trailHistory[i];
      if (!pt || pt.speed < 1.05) {
        this.dummy.position.set(0, -10, 0);
        this.dummy.scale.setScalar(0);
      } else {
        const fade = 1 - i / TRAIL_POINTS;
        const speedAlpha = Math.min(1, (pt.speed - 0.95) / 3.4);
        const s = fade * speedAlpha * scaleBoost;
        this.dummy.position.set(pt.x, SURFACE_Y + 0.0025, pt.z);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.set(s, 1, s);
      }
      this.dummy.updateMatrix();
      this.trailMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.trailMesh.instanceMatrix.needsUpdate = true;
  }

  public dispose(): void {
    this.sparkMesh.geometry.dispose();
    (this.sparkMesh.material as THREE.Material).dispose();
    this.trailMesh.geometry.dispose();
    this.trailMat.dispose();
    if (this.rings[0]) {
      this.rings[0].mesh.geometry.dispose();
    }
    this.rings.forEach((r) => r.mat.dispose());
  }
}
