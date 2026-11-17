import React, { useEffect, useRef, useState } from 'react';
import { AirHockeyEngine } from '@/game/engine/AirHockeyEngine';
import type {
  LiveMatchHUDState,
  MatchConfig,
  PlayerIdentity,
  UserPreferences,
} from '@/types/game';

interface GameCanvasProps {
  initialConfig: MatchConfig;
  initialPrefs: UserPreferences;
  initialProfiles: { p1: PlayerIdentity; p2: PlayerIdentity };
  onEngineReady: (engine: AirHockeyEngine) => void;
  onHUDUpdate: (hud: LiveMatchHUDState) => void;
  onMatchFinished: (hud: LiveMatchHUDState) => void;
  onCinematicGoal?: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  initialConfig,
  initialPrefs,
  initialProfiles,
  onEngineReady,
  onHUDUpdate,
  onMatchFinished,
  onCinematicGoal,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);

  const callbacksRef = useRef({
    onEngineReady,
    onHUDUpdate,
    onMatchFinished,
    onCinematicGoal,
  });
  callbacksRef.current = {
    onEngineReady,
    onHUDUpdate,
    onMatchFinished,
    onCinematicGoal,
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new AirHockeyEngine(
      container,
      initialConfig,
      initialPrefs,
      initialProfiles,
      {
        onHUDUpdate: (hud) => callbacksRef.current.onHUDUpdate(hud),
        onMatchFinished: (hud) => callbacksRef.current.onMatchFinished(hud),
        onCinematicGoal: () => callbacksRef.current.onCinematicGoal?.(),
        onContextLost: () => setContextLost(true),
        onContextRestored: () => setContextLost(false),
      }
    );

    callbacksRef.current.onEngineReady(engine);

    return () => {
      engine.dispose();
    };
    // Mount WebGL scene once to keep rendering stable across React UI updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full h-full touch-gameplay bg-[#05070C]">
      <div
        ref={mountRef}
        className="w-full h-full touch-gameplay"
        aria-label="EPIC SWING 3D Air Hockey Arena"
      />
      {contextLost && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#05070C]/95 p-6 text-center">
          <div className="max-w-sm rounded-xl border border-slate-700 bg-[#0B1324] p-6">
            <h2 className="font-display text-lg font-bold text-white">
              Graphics Context Paused
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Your device temporarily reclaimed WebGL memory. Tap below to reload the arena.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 min-h-[44px] w-full rounded-lg bg-cyan-400 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Reload Arena
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
