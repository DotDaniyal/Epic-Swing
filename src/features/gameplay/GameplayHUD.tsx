import React from 'react';
import {
  Bot,
  Maximize2,
  Minimize2,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { PlayerAvatarBadge } from '@/features/player-profiles/PlayerAvatarBadge';
import type {
  LiveMatchHUDState,
  MatchConfig,
  PlayerIdentity,
  UserPreferences,
} from '@/types/game';
import { formatClock } from '@/utils/format';

interface GameplayHUDProps {
  hud: LiveMatchHUDState;
  config: MatchConfig;
  profiles: { p1: PlayerIdentity; p2: PlayerIdentity };
  prefs: UserPreferences;
  isFullscreen: boolean;
  practiceSparring: boolean;
  onPause: () => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onPracticeSpeedChange: (speed: number) => void;
  onPracticeResetPuck: () => void;
  onTogglePracticeSparring: () => void;
}

export const GameplayHUD: React.FC<GameplayHUDProps> = ({
  hud,
  config,
  profiles,
  prefs,
  isFullscreen,
  practiceSparring,
  onPause,
  onToggleMute,
  onToggleFullscreen,
  onPracticeSpeedChange,
  onPracticeResetPuck,
  onTogglePracticeSparring,
}) => {
  const p2Label =
    config.mode === 'vs_ai'
      ? `AI · ${config.difficulty.toUpperCase()}`
      : config.mode === 'practice'
      ? 'Target'
      : profiles.p2.name || config.player2Name || 'Player 2';

  const p1Label = profiles.p1.name || config.player1Name || 'Player 1';

  const showMirroredTop =
    config.mode === 'two_player' && prefs.mirrorTopScoreOnMobile;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4">
      {/* Top Edge Arcade Broadcast Scoreboard */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-stretch overflow-hidden rounded-xl border border-white/15 bg-[#070B14]/95 shadow-xl pointer-events-auto">
          {/* Player 1 Scoreboard with Avatar & Custom Name */}
          <div className="flex items-center gap-2 sm:gap-2.5 border-b-2 border-cyan-400 bg-cyan-500/10 px-2 sm:px-3 py-1.5">
            <div className="hidden sm:block">
              <PlayerAvatarBadge
                avatarId={profiles.p1.avatarId}
                colorHex={profiles.p1.avatarColor}
                size="sm"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-400">
                PLAYER 1
              </span>
              <span className="max-w-[70px] sm:max-w-[115px] truncate text-xs font-bold text-white">
                {p1Label}
              </span>
            </div>
            <span
              key={`s1-${hud.score1}`}
              className="animate-score-pop font-mono-tabular text-2xl sm:text-3xl font-extrabold leading-none text-cyan-300"
            >
              {hud.score1}
            </span>
          </div>

          {/* Center Clock / Practice Speed */}
          <div className="flex flex-col items-center justify-center border-x border-white/10 bg-[#05070C] px-2.5 sm:px-4 py-1.5 min-w-[68px] sm:min-w-[84px]">
            {config.mode !== 'practice' ? (
              <>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  Time
                </span>
                <span
                  className={`font-mono-tabular text-base sm:text-xl font-extrabold leading-tight ${
                    hud.remainingSeconds <= 15
                      ? 'text-red-400'
                      : 'text-white'
                  }`}
                >
                  {formatClock(hud.remainingSeconds)}
                </span>
              </>
            ) : (
              <>
                <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-400">
                  Practice
                </span>
                <span className="font-mono-tabular text-sm sm:text-base font-extrabold leading-tight text-white">
                  {hud.puckSpeedKmh}{' '}
                  <span className="text-[10px] font-normal text-slate-400">
                    km/h
                  </span>
                </span>
              </>
            )}
          </div>

          {/* Player 2 Scoreboard with Avatar & Custom Name */}
          <div className="flex items-center gap-2 sm:gap-2.5 border-b-2 border-orange-500 bg-orange-500/10 px-2 sm:px-3 py-1.5">
            <span
              key={`s2-${hud.score2}`}
              className="animate-score-pop font-mono-tabular text-2xl sm:text-3xl font-extrabold leading-none text-orange-400"
            >
              {hud.score2}
            </span>
            <div className="flex flex-col items-end min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-wider text-orange-400">
                {config.mode === 'vs_ai' ? 'CPU' : 'PLAYER 2'}
              </span>
              <span className="max-w-[70px] sm:max-w-[115px] truncate text-xs font-bold text-white">
                {p2Label}
              </span>
            </div>
            {config.mode === 'two_player' && (
              <div className="hidden sm:block">
                <PlayerAvatarBadge
                  avatarId={profiles.p2.avatarId}
                  colorHex={profiles.p2.avatarColor}
                  size="sm"
                />
              </div>
            )}
          </div>
        </div>

        {/* Mirrored opposite-side mini scoreboard for 2P Local */}
        {showMirroredTop && (
          <div className="hidden md:flex items-center gap-3 rounded-xl border border-orange-500/35 bg-[#070B14]/95 px-3.5 py-2 rotate-180">
            <span className="text-xs font-bold text-orange-300 truncate max-w-[80px]">
              {p2Label}
            </span>
            <span className="font-mono-tabular text-lg font-extrabold text-orange-400">
              {hud.score2}
            </span>
            <span className="text-xs font-bold text-slate-500">:</span>
            <span className="font-mono-tabular text-lg font-extrabold text-cyan-300">
              {hud.score1}
            </span>
            <span className="text-slate-600">·</span>
            <span className="font-mono-tabular text-sm font-bold text-white">
              {formatClock(hud.remainingSeconds)}
            </span>
          </div>
        )}

        {/* Quick Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={prefs.muteAll ? 'Unmute audio' : 'Mute audio'}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-[#070B14]/95 text-slate-200 hover:border-cyan-400/60 hover:text-white cursor-pointer"
          >
            {prefs.muteAll ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            )}
          </button>

          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="hidden sm:flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-[#070B14]/95 text-slate-200 hover:border-cyan-400/60 hover:text-white cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={onPause}
            aria-label="Pause match"
            className="flex h-11 items-center gap-1.5 rounded-xl border border-white/15 bg-[#070B14]/95 px-3.5 text-xs font-bold text-white hover:border-cyan-400/60 cursor-pointer"
          >
            <Pause className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Pause</span>
          </button>
        </div>
      </div>

      {/* Center Overlays: Countdown & Goal Flash */}
      {hud.phase === 'countdown' && (
        <div className="flex flex-col items-center justify-center text-center">
          {config.mode === 'two_player' && (
            <div className="mb-4 rotate-180 rounded-lg border border-orange-500/50 bg-[#070B14]/95 px-4 py-1.5 text-xs font-bold text-orange-300 shadow-lg">
              {p2Label}: Touch &amp; Drag Top Half
            </div>
          )}
          <div className="animate-goal-in rounded-2xl border-2 border-cyan-400/70 bg-[#070B14]/95 px-9 py-5 shadow-2xl">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-300">
              Face-Off
            </div>
            <div className="mt-1 font-display text-6xl font-extrabold text-cyan-300 font-mono-tabular">
              {hud.countdownValue > 0 ? hud.countdownValue : 'PLAY'}
            </div>
          </div>
          {config.mode === 'two_player' && (
            <div className="mt-4 rounded-lg border border-cyan-400/50 bg-[#070B14]/95 px-4 py-1.5 text-xs font-bold text-cyan-300 shadow-lg">
              {p1Label}: Touch &amp; Drag Bottom Half
            </div>
          )}
        </div>
      )}

      {hud.phase === 'goal_pause' && hud.lastGoalScorer && (
        <div className="flex items-center justify-center">
          <div
            className={`animate-goal-in rounded-2xl border-2 px-8 py-5 text-center shadow-2xl bg-[#070B14]/95 ${
              hud.lastGoalScorer === 'p1'
                ? 'border-cyan-400'
                : 'border-orange-500'
            }`}
          >
            <div
              className={`font-display text-4xl sm:text-5xl font-extrabold tracking-tight ${
                hud.lastGoalScorer === 'p1' ? 'text-cyan-300' : 'text-orange-400'
              }`}
            >
              GOAL!
            </div>
            <div className="mt-1.5 text-sm font-bold text-white">
              {hud.lastGoalScorer === 'p1' ? p1Label : p2Label}
              <span className="mx-2 text-slate-500">·</span>
              <span className="font-mono-tabular text-amber-300">
                {hud.lastGoalSpeedKmh} km/h
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Edge: Practice Dock or Speed Readout */}
      <div className="flex items-end justify-center">
        {config.mode === 'practice' ? (
          <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-white/15 bg-[#070B14]/95 px-4 py-2 pointer-events-auto shadow-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">
                Puck Speed
              </span>
              <input
                type="range"
                min={0.6}
                max={1.5}
                step={0.1}
                value={config.practiceSpeedMultiplier}
                onChange={(e) =>
                  onPracticeSpeedChange(parseFloat(e.target.value))
                }
                aria-label="Practice puck speed"
                className="arena-slider w-24 sm:w-32"
              />
              <span className="font-mono-tabular text-xs font-bold text-cyan-300 w-9">
                {config.practiceSpeedMultiplier.toFixed(1)}x
              </span>
            </div>

            <button
              type="button"
              onClick={onTogglePracticeSparring}
              className={`flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-colors cursor-pointer ${
                practiceSparring
                  ? 'border-orange-400 bg-orange-500/20 text-orange-200'
                  : 'border-white/15 bg-[#0E1729] text-slate-200 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{practiceSparring ? 'Sparring On' : 'Open Goal'}</span>
            </button>

            <button
              type="button"
              onClick={onPracticeResetPuck}
              className="flex min-h-[38px] items-center gap-1.5 rounded-lg bg-cyan-400 px-3 text-xs font-extrabold text-slate-950 hover:bg-cyan-300 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Launch Puck</span>
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-[#070B14]/85 px-3.5 py-1 text-[11px] font-semibold text-slate-300">
            <span className="font-mono-tabular text-white">
              {hud.puckSpeedKmh} km/h
            </span>
            <span className="mx-2 text-slate-500">·</span>
            <span className="font-mono-tabular text-amber-300">
              Peak {hud.topSpeedKmh} km/h
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
