import React from 'react';
import {
  Home,
  Music,
  Play,
  RotateCcw,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { EpicSwingLogo } from '@/components/common/EpicSwingLogo';
import type { MatchConfig, PlayerIdentity } from '@/types/game';

interface PauseModalProps {
  config: MatchConfig;
  profiles: { p1: PlayerIdentity; p2: PlayerIdentity };
  score1: number;
  score2: number;
  muteAll: boolean;
  musicEnabled: boolean;
  onResume: () => void;
  onRestart: () => void;
  onToggleMute: () => void;
  onToggleMusic: () => void;
  onOpenSettings: () => void;
  onMainMenu: () => void;
  onButtonClick: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  config,
  profiles,
  score1,
  score2,
  muteAll,
  musicEnabled,
  onResume,
  onRestart,
  onToggleMute,
  onToggleMusic,
  onOpenSettings,
  onMainMenu,
  onButtonClick,
}) => {
  const p1Name = profiles.p1.name || config.player1Name;
  const p2Name =
    config.mode === 'vs_ai'
      ? `Arena AI (${config.difficulty.toUpperCase()})`
      : config.mode === 'practice'
      ? 'Practice'
      : profiles.p2.name || config.player2Name;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/78 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#070B14] p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <EpicSwingLogo variant="compact" />
          <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Game Paused
          </p>
          <h2 className="mt-0.5 font-display text-2xl font-extrabold text-white">
            Match Control
          </h2>

          <div className="mt-4 w-full grid grid-cols-3 items-center rounded-xl border border-white/10 bg-[#0C1424] px-4 py-3">
            <div className="min-w-0">
              <div className="truncate text-[11px] font-bold text-cyan-400">
                {p1Name}
              </div>
              <div className="font-mono-tabular text-3xl font-extrabold text-white">
                {score1}
              </div>
            </div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
              vs
            </div>
            <div className="min-w-0">
              <div className="truncate text-[11px] font-bold text-orange-400">
                {p2Name}
              </div>
              <div className="font-mono-tabular text-3xl font-extrabold text-white">
                {score2}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            onClick={() => {
              onButtonClick();
              onResume();
            }}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 font-display text-sm font-extrabold text-slate-950 hover:bg-cyan-300 cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>Resume Match</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onButtonClick();
              onRestart();
            }}
            className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#0E1729] text-sm font-bold text-white hover:border-cyan-400/50 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-cyan-400" />
            <span>Restart Match</span>
          </button>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                onButtonClick();
                onToggleMute();
              }}
              className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-[#0E1729] px-2 text-xs font-bold text-slate-200 hover:border-white/30 cursor-pointer"
            >
              {muteAll ? (
                <>
                  <VolumeX className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Unmute</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Sound</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onButtonClick();
                onToggleMusic();
              }}
              className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-[#0E1729] px-2 text-xs font-bold text-slate-200 hover:border-white/30 cursor-pointer"
            >
              <Music
                className={`w-4 h-4 shrink-0 ${
                  !muteAll && musicEnabled ? 'text-cyan-400' : 'text-slate-500'
                }`}
              />
              <span>{!muteAll && musicEnabled ? 'Music On' : 'Music Off'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onButtonClick();
                onOpenSettings();
              }}
              className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-[#0E1729] px-2 text-xs font-bold text-slate-200 hover:border-white/30 cursor-pointer"
            >
              <Settings className="w-4 h-4 text-slate-300 shrink-0" />
              <span>Settings</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onButtonClick();
              onMainMenu();
            }}
            className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#05070C] text-sm font-semibold text-slate-300 hover:text-white cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
