# Architecture Overview

EPIC SWING separates **React UI/state**, **domain economy/storage logic**, and the **Three.js 3D game engine** into strict, acyclic layers.

## Dependency Direction

```text
src/main.tsx
  └── src/app/App.tsx
        ├── src/features/*                 (Screens, HUD, Store, Economy)
        ├── src/components/common/*        (Shared Branding & PWA UI)
        └── src/game/engine/AirHockeyEngine.ts
              ├── src/game/physics/AirHockeyPhysics.ts
              ├── src/game/ai/HockeyAI.ts
              ├── src/game/controls/MultiTouchInputController.ts
              ├── src/game/camera/ArenaCameraController.ts
              ├── src/game/gameplay/CinematicChoreography.ts
              ├── src/game/scene/sceneBuilder.ts
              ├── src/game/objects/strikerFactory.ts
              ├── src/game/renderer/textures.ts
              ├── src/game/vfx/ArenaVFX.ts
              └── src/audio/SoundEngine.ts
                    └── src/config/catalog/*, src/storage/*, src/utils/*, src/types/game.ts
```

## Core Runtime Loops

### 1. Render & Simulation Loop (`AirHockeyEngine`)
1. `requestAnimationFrame` computes clamped frame delta (`<= MAX_FRAME_DT`).
2. Software WebGL detection (`detectSoftwareWebGL`) and WebGL2 `fenceSync` pacing (`scheduleAfterDraw`) prevent GPU command queue stalls on low-power devices.
3. During `active` gameplay:
   - `MultiTouchInputController.updateKeyboard(dt)` applies keyboard nudges.
   - `HockeyAI.update(physics, dt)` computes P2 targets in `vs_ai` mode.
   - `AirHockeyPhysics.step(dt)` advances physics in `1/240s` fixed substeps.
   - Mesh positions, puck spin, and `ArenaVFX` particles/trails update to match simulation state.
   - `ArenaCameraController` smoothly interpolates between Broadcast, Top-Down, and Cinematic Intro rigs.

### 2. Physics Sub-Stepping (`AirHockeyPhysics`)
- **Fixed Timestep**: `FIXED_DT = 1 / 240` guarantees paddles and fast pucks never tunnel through rails or each other.
- **Boundaries**: Enforces side walls, back walls outside the goal mouth, goal-post circular collars, four rounded table corners, and center-divider separation between P1 (`z > 0`) and P2 (`z < 0`).
- **Stuck Puck Recovery**: Gently nudges any puck stalled against a cushion after `1.6s`.

### 3. State & Persistence (`src/storage`)
- All save data lives under `epic_swing_save_v2` in `localStorage`.
- `loadSaveData()` automatically runs `migrateLegacyV1Data()` if v1 keys exist, validates shapes via `validateParsedSaveData()`, and sanitizes both player profiles (`sanitizeProfile()`).
- Daily challenges auto-reset on local date change via `ensureDailyChallengesCurrent()`.
