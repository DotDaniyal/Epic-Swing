# EPIC SWING — 3D Arcade Air Hockey

**EPIC SWING** is a commercial-grade 3D arcade air hockey web game engineered with React 19, TypeScript, Three.js, GSAP, Tailwind CSS v4, and the Web Audio API. Designed for mobile multi-touch, tablets, touchscreen laptops, and desktops, it delivers 240Hz fixed-timestep physics, simultaneous two-player pointer controls, adaptive AI, full player customization, a persistent coin economy, and offline PWA support.

## Core Capabilities

- **3D Arcade Arena (Three.js)**: Custom metallic arcade chassis, brushed rails, rounded-corner ice rink with dynamic center/goal lighting, crisp shadows, contact shadows, and 3D striker & puck meshes.
- **240Hz Sub-Stepped Physics (`AirHockeyPhysics`)**: Zero-tunneling collision resolution against rounded table walls, goal posts, center-line dividers, and paddle-puck momentum/spin impulses.
- **Simultaneous Multi-Touch & Desktop Controls (`MultiTouchInputController`)**: Independent Pointer Events tracking for two human players on one device, plus mouse and keyboard (`Arrow` / `WASD`) controls.
- **Adaptive AI (`HockeyAI`)**: Easy, Medium, and Hard difficulty profiles featuring trajectory prediction, defensive retreat, attack pursuit, and corner unblocking.
- **Customization, Store & Economy**: Separate Player 1 & Player 2 profiles, 10 striker models, 10 color palettes + custom hex picker, 6 table themes, 5 puck skins, trails, goal explosions, and daily challenges persisted in `localStorage`.
- **Cinematic Intro & Procedural Audio**: Multi-stage GSAP + 3D flyover opening sequence and synthesized Web Audio sound effects.

## Technology Stack

- **UI Framework**: React 19 + TypeScript + Tailwind CSS v4
- **3D Graphics**: Three.js (`@types/three`)
- **Animations**: GSAP (`gsap`)
- **Audio**: Web Audio API (`SoundEngine`)
- **Icons**: Lucide React
- **Build & PWA**: Vite + `vite-plugin-pwa`
- **Testing**: `tsx` + Node `node:assert/strict`

## Project Structure

```text
src/
├── animations/         # Centralized GSAP animation helpers & intro timings
├── app/                # Root App orchestrator
├── audio/              # Procedural Web Audio synthesizer (SoundEngine)
├── components/common/  # Shared UI (EpicSwingLogo, OfflineIndicator, PWAInstallButton)
├── config/catalog/     # Store catalog items, themes, strikers, rewards, daily challenges
├── features/           # Domain-driven UI & feature logic
│   ├── coin-system/    # Match reward calculation & coin burst overlay
│   ├── customization/  # 3D live preview viewport & customization workbench
│   ├── game-store/     # Store purchases, equip helpers, & storefront UI
│   ├── gameplay/       # GameCanvas, GameplayHUD, PauseModal, ResultsModal
│   ├── introduction/   # LoadingScreen & 3-scene CinematicIntro
│   ├── main-menu/      # MainMenu, MatchSetupWizard, InstructionsScreen
│   ├── player-profiles/# PlayerAvatarBadge & ProfileScreen
│   ├── settings/       # Audio, graphics quality, camera, & reset settings
│   └── statistics/     # Career stats & recent match history
├── game/               # Modular 3D engine & simulation subsystems
│   ├── ai/             # Adaptive AI opponent (HockeyAI)
│   ├── camera/         # Broadcast/Top-Down/Intro camera rig (ArenaCameraController)
│   ├── constants/      # Physical table dimensions, palette, simulation constants
│   ├── controls/       # Multi-touch & keyboard input (MultiTouchInputController)
│   ├── engine/         # High-level match orchestrator (AirHockeyEngine)
│   ├── gameplay/       # Match intro & goal celebration choreography
│   ├── objects/        # Procedural 3D striker geometry & materials factory
│   ├── physics/        # 240Hz fixed-timestep 2D rigid-body physics
│   ├── renderer/       # Procedural canvas textures (ice, brushed metal, carbon, shadows)
│   ├── scene/          # 3D table, walls, goals, lighting, & puck builder
│   └── vfx/            # Sparks, impact rings, puck trails, & goal bursts
├── hooks/              # Online status & PWA install prompt hooks
├── storage/            # LocalStorage persistence, sanitization, & v1->v2 migrations
├── styles/             # Global Tailwind CSS theme & arcade utilities
├── types/              # Shared TypeScript domain interfaces
└── utils/              # Formatting helpers & WebGL capability/sync utilities
```

## Quick Start

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Run automated unit tests
npm test

# Type-check and build for production
npm run lint
npm run build
```

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Features & Game Systems](docs/FEATURES.md)
- [Development Guide](docs/DEVELOPMENT.md)
