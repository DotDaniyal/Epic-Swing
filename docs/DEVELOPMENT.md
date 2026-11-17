# Development Guide

## Available Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Starts Vite development server on port `3000` |
| `npm test` | Executes all unit test suites in `tests/` via `tsx` |
| `npm run lint` | Runs strict TypeScript type-checking (`tsc --noEmit`) |
| `npm run build` | Compiles production bundle & PWA service worker into `dist/` |
| `npm run preview` | Serves the production build locally |

## Path Aliases

`@/*` resolves to `./src/*` in both `tsconfig.json` and `vite.config.ts`. Always use `@/` imports across features, game subsystems, and tests.

## Adding Store Items or Cosmetics

1. Add the new ID union member in `src/types/game.ts`.
2. Register the catalog entry (name, price, rarity, preview colors) in the appropriate file under `src/config/catalog/` (`strikers.ts`, `themes.ts`, or `cosmetics.ts`).
3. If the item affects 3D visuals, update `src/game/objects/strikerFactory.ts`, `src/game/scene/sceneBuilder.ts`, or `src/game/vfx/ArenaVFX.ts`.
4. Add or update assertions in `tests/economy-store.test.ts` if pricing or equip behavior changes.

## Running & Writing Tests

Tests live under `tests/` and use Node's built-in `node:assert/strict` executed directly through `tsx`:
- `tests/physics.test.ts` — 240Hz bounds clamping, wall bounce, paddle hits, and goal detection
- `tests/ai-controls.test.ts` — AI difficulty scaling, defensive/intercept positioning, and format utilities
- `tests/economy-store.test.ts` — Match coin payouts, duplicate reward guard, daily challenges, store purchases
- `tests/storage-migrations.test.ts` — Profile sanitization, v1-to-v2 migration, LocalStorage persistence, and resets

Run all suites with:

```bash
npm test
```
