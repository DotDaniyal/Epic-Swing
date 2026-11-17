import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Bot,
  CalendarCheck,
  Coins,
  Maximize2,
  Minimize2,
  Palette,
  Play,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Target,
  User,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { animatePanelEnter } from '@/animations/timelines';
import { EpicSwingLogo } from '@/components/common/EpicSwingLogo';
import { PWAInstallButton } from '@/components/common/PWAInstallButton';
import { PlayerAvatarBadge } from '@/features/player-profiles/PlayerAvatarBadge';
import type {
  DailyChallengesState,
  GameMode,
  MatchConfig,
  PlayerIdentity,
  ScreenId,
} from '@/types/game';
import { formatDurationLabel } from '@/utils/format';

interface MainMenuProps {
  config: MatchConfig;
  profiles: { p1: PlayerIdentity; p2: PlayerIdentity };
  dailyChallenges: DailyChallengesState;
  muteAll: boolean;
  isFullscreen: boolean;
  reducedMotion: boolean;
  onStartQuickMatch: (mode?: GameMode) => void;
  onNavigate: (screen: ScreenId) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onButtonClick: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  config,
  profiles,
  dailyChallenges,
  muteAll,
  isFullscreen,
  reducedMotion,
  onStartQuickMatch,
  onNavigate,
  onToggleMute,
  onToggleFullscreen,
  onButtonClick,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [showChallenges, setShowChallenges] = useState(false);

  useEffect(() => {
    animatePanelEnter(panelRef.current, reducedMotion);
  }, [reducedMotion]);

  const completedCount = dailyChallenges.challenges.filter((c) => c.claimed).length;
  const totalChallenges = dailyChallenges.challenges.length;

  const modeLabel =
    config.mode === 'two_player'
      ? '2P Local'
      : config.mode === 'vs_ai'
      ? `vs AI (${config.difficulty})`
      : 'Practice';

  const durationLabel = formatDurationLabel(
    config.durationSeconds,
    config.mode === 'practice'
  );

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-3.5 sm:p-6 pointer-events-none">
      {/* Top Bar: Official EPIC SWING Logo, Coin Balance, Profile & Utility Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pointer-events-auto">
        <div className="flex items-center gap-3 rounded-xl border border-white/12 bg-[#070B14]/92 px-3.5 py-2 shadow-xl">
          <EpicSwingLogo variant="compact" />
        </div>

        <div className="flex items-center gap-2">
          {/* Active Coin Balance */}
          <button
            type="button"
            onClick={() => {
              onButtonClick();
              onNavigate('store');
            }}
            className="flex min-h-[44px] items-center gap-2 rounded-xl border border-amber-400/35 bg-[#070B14]/92 px-3.5 text-amber-300 hover:border-amber-400 cursor-pointer shadow-lg"
            aria-label="Coin balance — Open Store"
          >
            <Coins className="w-4 h-4 shrink-0" />
            <span className="font-mono-tabular text-sm font-extrabold">
              {profiles.p1.coins.toLocaleString()}
            </span>
          </button>

          {/* Daily Challenges Toggle */}
          <button
            type="button"
            onClick={() => {
              onButtonClick();
              setShowChallenges((v) => !v);
            }}
            className={`flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-colors cursor-pointer ${
              showChallenges
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                : 'border-white/12 bg-[#070B14]/92 text-slate-200 hover:border-cyan-400/50'
            }`}
          >
            <CalendarCheck className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Daily</span>
            <span className="font-mono-tabular text-cyan-300">
              {completedCount}/{totalChallenges}
            </span>
          </button>

          <PWAInstallButton compact onAction={onButtonClick} />

          <button
            type="button"
            onClick={() => {
              onButtonClick();
              onToggleMute();
            }}
            aria-label={muteAll ? 'Unmute audio' : 'Mute audio'}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/12 bg-[#070B14]/92 text-slate-200 transition-colors hover:border-cyan-400/50 hover:text-white cursor-pointer"
          >
            {muteAll ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            )}
          </button>

          {typeof document !== 'undefined' &&
            Boolean(document.documentElement?.requestFullscreen) && (
              <button
                type="button"
                onClick={() => {
                  onButtonClick();
                  onToggleFullscreen();
                }}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/12 bg-[#070B14]/92 text-slate-200 transition-colors hover:border-cyan-400/50 hover:text-white cursor-pointer"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            )}
        </div>
      </div>

      {/* Optional Daily Challenges Popover Card */}
      {showChallenges && (
        <div className="mx-auto w-full max-w-lg rounded-2xl border border-cyan-400/35 bg-[#070B14]/96 p-4 shadow-2xl pointer-events-auto">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-cyan-400" />
              <h3 className="font-display text-sm font-extrabold text-white">
                Daily Challenges · {dailyChallenges.dateKey}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowChallenges(false)}
              className="text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {dailyChallenges.challenges.map((ch) => (
              <div
                key={ch.id}
                className={`rounded-xl border p-3 ${
                  ch.claimed
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-white/10 bg-[#0C1424]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">{ch.title}</span>
                  <span className="font-mono-tabular text-[11px] font-extrabold text-amber-300">
                    +{ch.rewardCoins}c
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400">{ch.description}</p>
                <div className="mt-2 flex items-center justify-between text-[10px] font-bold">
                  <span className="font-mono-tabular text-cyan-300">
                    {ch.progress} / {ch.target}
                  </span>
                  <span className={ch.claimed ? 'text-emerald-400' : 'text-slate-400'}>
                    {ch.claimed ? 'Claimed' : 'In Progress'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Main Arcade Command Deck */}
      <div
        ref={panelRef}
        className="mx-auto w-full max-w-2xl rounded-2xl border border-white/15 bg-[#070B14]/94 p-4 sm:p-6 shadow-2xl pointer-events-auto"
      >
        {/* Identity & Active Matchup Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <PlayerAvatarBadge
              avatarId={profiles.p1.avatarId}
              colorHex={profiles.p1.avatarColor}
              size="md"
            />
            <div className="min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-none">
                EPIC <span className="text-cyan-400">SWING</span>
              </h1>
              <p className="mt-1 truncate text-xs text-slate-300">
                {profiles.p1.name} vs{' '}
                {config.mode === 'vs_ai'
                  ? 'Arena AI'
                  : config.mode === 'practice'
                  ? 'Practice Drill'
                  : profiles.p2.name}{' '}
                <span className="mx-1 text-slate-500">·</span>
                <span className="font-semibold text-cyan-300">{modeLabel}</span>
                <span className="mx-1 text-slate-500">·</span>
                <span className="font-mono-tabular text-slate-100">
                  {durationLabel}
                </span>
                {config.mode !== 'practice' && (
                  <>
                    <span className="mx-1 text-slate-500">·</span>
                    <span className="font-semibold text-amber-300">
                      {config.winningScore > 0
                        ? `First to ${config.winningScore}`
                        : 'Timed'}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onButtonClick();
              onStartQuickMatch();
            }}
            className="flex min-h-[46px] items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 px-5 font-display text-sm font-extrabold text-slate-950 transition-transform hover:brightness-110 active:scale-[0.98] cursor-pointer shadow-lg"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>PLAY GAME</span>
          </button>
        </div>

        {/* Quick Mode Launchers */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              onButtonClick();
              onStartQuickMatch('two_player');
            }}
            className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/12 px-3 text-xs sm:text-sm font-bold text-cyan-200 hover:bg-cyan-500/22 cursor-pointer"
          >
            <Users className="w-4 h-4 text-cyan-300 shrink-0" />
            <span className="truncate">2P Local</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onButtonClick();
              onStartQuickMatch('vs_ai');
            }}
            className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/14 px-3 text-xs sm:text-sm font-bold text-orange-200 hover:bg-orange-500/24 cursor-pointer"
          >
            <Bot className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="truncate">Play vs AI</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onButtonClick();
              onStartQuickMatch('practice');
            }}
            className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#0C1424] px-3 text-xs sm:text-sm font-bold text-white hover:border-cyan-400/50 cursor-pointer"
          >
            <Target className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="truncate">Practice</span>
          </button>
        </div>

        {/* Primary Arcade Hub Navigation: CUSTOMIZE | GAME STORE | PLAYER PROFILE | SETTINGS */}
        <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => {
              onButtonClick();
              onNavigate('customize');
            }}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/12 bg-[#0C1424] px-3 text-xs font-bold text-white transition-colors hover:border-cyan-400/60 cursor-pointer"
          >
            <Palette className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>CUSTOMIZE</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onButtonClick();
              onNavigate('store');
            }}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 text-xs font-bold text-amber-200 transition-colors hover:border-amber-400 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-amber-300 shrink-0" />
            <span>GAME STORE</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onButtonClick();
              onNavigate('profile');
            }}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/12 bg-[#0C1424] px-3 text-xs font-bold text-white transition-colors hover:border-cyan-400/60 cursor-pointer"
          >
            <User className="w-4 h-4 text-orange-400 shrink-0" />
            <span>PROFILE</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onButtonClick();
              onNavigate('settings');
            }}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/12 bg-[#0C1424] px-3 text-xs font-bold text-white transition-colors hover:border-cyan-400/60 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-300 shrink-0" />
            <span>SETTINGS</span>
          </button>
        </div>

        {/* Utility Row: Match Setup, Statistics, How to Play */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5 text-xs text-slate-300">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onButtonClick();
                onNavigate('setup_mode');
              }}
              className="inline-flex items-center gap-1.5 font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Match Setup</span>
            </button>
            <span className="text-slate-600">·</span>
            <button
              type="button"
              onClick={() => {
                onButtonClick();
                onNavigate('statistics');
              }}
              className="inline-flex items-center gap-1.5 font-semibold text-slate-200 hover:text-white cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5 text-orange-400" />
              <span>Statistics</span>
            </button>
            <span className="text-slate-600">·</span>
            <button
              type="button"
              onClick={() => {
                onButtonClick();
                onNavigate('instructions');
              }}
              className="inline-flex items-center gap-1.5 font-semibold text-slate-200 hover:text-white cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>How to Play</span>
            </button>
          </div>
          <span className="text-[11px] text-slate-400">
            2-Finger Multi-Touch Ready
          </span>
        </div>
      </div>
    </div>
  );
};
