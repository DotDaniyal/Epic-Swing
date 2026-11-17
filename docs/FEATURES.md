# Features & Game Systems

## Game Modes

1. **2-Player Local (`two_player`)**: Simultaneous multi-touch play on a single touchscreen device using independent pointer ID tracking (`p1PointerId` / `p2PointerId`), plus dual keyboard support (`Arrows` for P1, `WASD` for P2).
2. **Vs AI (`vs_ai`)**: Single-player match against `HockeyAI` with three tuned profiles:
   - **Easy**: Slower reaction interval (`140ms`), `0.56x` speed factor, mild aim jitter.
   - **Medium**: Balanced (`75ms` reaction, `0.80x` speed, trajectory prediction).
   - **Hard**: Tournament pace (`25ms` reaction, `1.0x` speed, aggressive interception).
3. **Practice (`practice`)**: Free-play drill mode with configurable puck speed multiplier (`0.75x` – `1.5x`) and automatic puck re-launch.

## Match Setup & Presets

- Configurable match durations (1, 2, 3, 5 minutes, or custom minutes).
- Persistent Player 1 & Player 2 names and profiles.
- Instant camera toggle between **Broadcast 3D** and **Top-Down 2D-style** view, plus optional mobile mirrored top scoreboard.

## Customization & Store Economy

Both Player 1 and Player 2 maintain independent wallets, owned inventories, and equipped loadouts:
- **10 Striker Styles**: Classic, Neon Cyan, Fiery Orange, Red Metallic, Purple Electric, Golden Premium, Ice Crystal, Carbon Fiber, Holographic, Legendary Animated.
- **10 Color Palettes + Custom Color Picker**
- **6 Table Themes**: Classic Arcade, Neon Arena, Fire Arena, Ice Arena, Golden Arena, Cyber Arena.
- **5 Puck Skins, 5 Puck Trails, 5 Goal Explosions, 10 Avatars, 5 Arena Backgrounds**

### Coin Rewards & Daily Challenges
- Win (`+100`), Draw (`+40`), Loss (`+25`), Clean Sheet Bonus (`+35`), 3-Win Streak Bonus (`+75`).
- Duplicate match reward prevention via `rewardedMatchIds`.
- Four rotating daily challenges auto-claimed on completion.

## Cinematic Intro & PWA Offline Support

- First-time launch plays a 3-scene GSAP + 3D table flyover (`CinematicIntro`) with an option to skip or toggle Auto/Skip in Settings.
- Service Worker precaching (`vite-plugin-pwa`) enables full offline gameplay with an `OfflineIndicator` badge and in-app `PWAInstallButton`.
