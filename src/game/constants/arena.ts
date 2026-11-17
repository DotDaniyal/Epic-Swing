import type { GameplaySpeedPreset } from '@/types/game';

// Table dimensions in meters (realistic commercial 8ft air hockey ratio ~ 1 : 1.94)
export const TABLE_WIDTH = 1.24;
export const TABLE_LENGTH = 2.40;
export const HALF_WIDTH = TABLE_WIDTH / 2; // 0.62
export const HALF_LENGTH = TABLE_LENGTH / 2; // 1.20
export const CORNER_RADIUS = 0.16;
export const GOAL_WIDTH = 0.42;
export const GOAL_HALF_WIDTH = GOAL_WIDTH / 2; // 0.21
export const GOAL_DEPTH = 0.13;

export const SURFACE_Y = 0.78;
export const RAIL_HEIGHT = 0.058;
export const RAIL_THICKNESS = 0.088;

// Actor physical dimensions
export const PUCK_RADIUS = 0.044;
export const PUCK_HEIGHT = 0.017;
export const PUCK_MASS = 1.0;

// +35.3% diameter increase from 0.068m baseline for comfortable finger-first control
export const PADDLE_RADIUS = 0.092;
export const PADDLE_BASE_HEIGHT = 0.028;
export const PADDLE_MASS = 2.8;

// Physics constants calibrated for comfortable, realistic Normal gameplay speed
export const FIXED_DT = 1 / 240; // 240 Hz substeps for zero-tunneling collisions
export const MAX_FRAME_DT = 0.05;
export const MAX_PUCK_SPEED = 4.9;
export const MAX_PADDLE_SPEED = 5.0;
export const PUCK_AIR_DRAG = 0.42;
export const WALL_RESTITUTION = 0.84;
export const PADDLE_RESTITUTION = 0.82;
export const CENTER_DIVIDER_MARGIN = 0.006;

export const GAMEPLAY_SPEED_SCALES: Record<GameplaySpeedPreset, number> = {
  slow: 0.78,
  normal: 1.0,
  fast: 1.26,
};

/**
 * Computes device-aware striker collision/visual radius so small phones gain
 * extra finger comfort without oversized strikers on tablets/desktops.
 */
export function computeDeviceStrikerRadius(viewportMinPx: number): number {
  if (!Number.isFinite(viewportMinPx) || viewportMinPx <= 0) {
    return PADDLE_RADIUS;
  }
  if (viewportMinPx <= 390) return PADDLE_RADIUS * 1.05; // ~0.0966m
  if (viewportMinPx <= 520) return PADDLE_RADIUS * 1.02; // ~0.0938m
  if (viewportMinPx >= 900) return PADDLE_RADIUS * 0.96; // ~0.0883m
  return PADDLE_RADIUS;
}

// Visual speed scale: 1 m/s -> ~18 km/h arcade display readout
export const SPEED_TO_KMH = 18.0;

// High-Contrast Vibrant Arcade Color Palette
export const COLORS = {
  midnightBg: 0x05070c,
  arenaFloor: 0x070a12,
  tableBody: 0x0a1324,
  tableRailDark: 0x162238,
  railChrome: 0xb8c4d4,
  iceSurface: 0x0c1c38,
  p1Cyan: 0x00d8f6,
  p1CyanBright: 0x38f2ff,
  p2Orange: 0xff3b2f,
  p2OrangeBright: 0xff6b4a,
  puckBody: 0x0b101b,
  puckTop: 0xf8fafc,
  puckCore: 0xfacc15,
  goalLightP1: 0x00d8f6,
  goalLightP2: 0xff3b2f,
} as const;
