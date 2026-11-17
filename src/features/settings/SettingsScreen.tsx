import React, { useState } from 'react';
import {
  ArrowLeft,
  Film,
  Monitor,
  Music,
  PlayCircle,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { EpicSwingLogo } from '@/components/common/EpicSwingLogo';
import { PWAInstallButton } from '@/components/common/PWAInstallButton';
import type {
  CameraViewMode,
  QualityPreset,
  UserPreferences,
} from '@/types/game';

interface SettingsScreenProps {
  prefs: UserPreferences;
  onChange: (next: UserPreferences) => void;
  onReplayIntro: () => void;
  onResetAllProgress: () => void;
  onBack: () => void;
  onButtonClick: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  prefs,
  onChange,
  onReplayIntro,
  onResetAllProgress,
  onBack,
  onButtonClick,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const update = (patch: Partial<UserPreferences>) => {
    onChange({ ...prefs, ...patch });
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/82 p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-[#070B14] p-5 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onButtonClick();
              onBack();
            }}
            className="flex min-h-[44px] items-center gap-2 rounded-lg border border-white/10 bg-[#0E1729] px-3 text-xs font-semibold text-slate-200 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <EpicSwingLogo variant="compact" />
          <div className="w-16 text-right text-xs font-bold uppercase tracking-wider text-slate-400">
            Settings
          </div>
        </div>

        {/* Audio Section */}
        <div className="mt-5 space-y-4 rounded-xl border border-white/10 bg-[#0C1424] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {prefs.muteAll ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              )}
              <span className="font-display text-sm font-bold text-white">
                Master Audio
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onButtonClick();
                update({ muteAll: !prefs.muteAll });
              }}
              className={`min-h-[38px] rounded-lg px-3.5 text-xs font-bold transition-colors cursor-pointer ${
                prefs.muteAll
                  ? 'bg-red-500 text-white'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              }`}
            >
              {prefs.muteAll ? 'Muted' : 'Active'}
            </button>
          </div>

          <div className="border-t border-white/10 pt-3">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="sfx-vol" className="font-semibold text-slate-200">
                Sound Effects Volume
              </label>
              <span className="font-mono-tabular text-cyan-300">
                {Math.round(prefs.sfxVolume * 100)}%
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <input
                id="sfx-vol"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={prefs.sfxVolume}
                onChange={(e) =>
                  update({
                    sfxVolume: parseFloat(e.target.value),
                    sfxEnabled: parseFloat(e.target.value) > 0,
                  })
                }
                className="arena-slider flex-1"
              />
              <button
                type="button"
                onClick={() => {
                  onButtonClick();
                  update({ sfxEnabled: !prefs.sfxEnabled });
                }}
                className="min-h-[36px] rounded-lg border border-white/12 px-3 text-xs font-semibold text-slate-200 cursor-pointer"
              >
                {prefs.sfxEnabled ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          <div className="border-t border-white/10 pt-3">
            <div className="flex items-center justify-between text-xs">
              <label
                htmlFor="music-vol"
                className="flex items-center gap-1.5 font-semibold text-slate-200"
              >
                <Music className="w-3.5 h-3.5 text-cyan-400" />
                <span>Arena Music Volume</span>
              </label>
              <span className="font-mono-tabular text-cyan-300">
                {Math.round(prefs.musicVolume * 100)}%
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <input
                id="music-vol"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={prefs.musicVolume}
                onChange={(e) =>
                  update({
                    musicVolume: parseFloat(e.target.value),
                    musicEnabled: parseFloat(e.target.value) > 0,
                  })
                }
                className="arena-slider flex-1"
              />
              <button
                type="button"
                onClick={() => {
                  onButtonClick();
                  update({ musicEnabled: !prefs.musicEnabled });
                }}
                className="min-h-[36px] rounded-lg border border-white/12 px-3 text-xs font-semibold text-slate-200 cursor-pointer"
              >
                {prefs.musicEnabled ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        </div>

        {/* Cinematic Intro Settings */}
        <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-[#0C1424] p-4">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-orange-400" />
            <span className="font-display text-sm font-bold text-white">
              Cinematic Intro
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onButtonClick();
                update({ introPreference: 'auto' });
              }}
              className={`min-h-[42px] rounded-lg px-3 text-xs font-bold transition-colors cursor-pointer ${
                prefs.introPreference === 'auto'
                  ? 'bg-cyan-400 text-slate-950'
                  : 'border border-white/10 bg-[#080F1E] text-slate-300 hover:text-white'
              }`}
            >
              Play Automatically
            </button>
            <button
              type="button"
              onClick={() => {
                onButtonClick();
                update({ introPreference: 'skip' });
              }}
              className={`min-h-[42px] rounded-lg px-3 text-xs font-bold transition-colors cursor-pointer ${
                prefs.introPreference === 'skip'
                  ? 'bg-cyan-400 text-slate-950'
                  : 'border border-white/10 bg-[#080F1E] text-slate-300 hover:text-white'
              }`}
            >
              Skip on Launch
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onButtonClick();
              onReplayIntro();
            }}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/12 text-xs font-bold text-orange-300 hover:bg-orange-500/20 cursor-pointer"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Replay Cinematic Intro Now</span>
          </button>
        </div>

        {/* Graphics & Camera Section */}
        <div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-[#0C1424] p-4">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-cyan-400" />
            <span className="font-display text-sm font-bold text-white">
              Visuals &amp; Camera
            </span>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-300">
              Graphics Quality
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {(['auto', 'high', 'balanced', 'low'] as QualityPreset[]).map(
                (q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      onButtonClick();
                      update({ quality: q });
                    }}
                    className={`min-h-[40px] rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                      prefs.quality === q
                        ? 'bg-cyan-400 text-slate-950'
                        : 'border border-white/10 bg-[#080F1E] text-slate-300 hover:text-white'
                    }`}
                  >
                    {q}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-300">
              Camera Angle
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'broadcast', label: 'Broadcast Tilt' },
                  { id: 'top_down', label: 'Top-Down Pro' },
                ] as Array<{ id: CameraViewMode; label: string }>
              ).map((cam) => (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => {
                    onButtonClick();
                    update({ cameraView: cam.id });
                  }}
                  className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    prefs.cameraView === cam.id
                      ? 'bg-cyan-400 text-slate-950'
                      : 'border border-white/10 bg-[#080F1E] text-slate-300 hover:text-white'
                  }`}
                >
                  {cam.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 pt-3">
            <div>
              <div className="text-xs font-semibold text-slate-200">
                Reduced Motion
              </div>
              <div className="text-[11px] text-slate-400">
                Disable camera shake, hitstop, and particle bursts
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onButtonClick();
                update({ reducedMotion: !prefs.reducedMotion });
              }}
              className={`min-h-[38px] rounded-lg px-3.5 text-xs font-bold cursor-pointer ${
                prefs.reducedMotion
                  ? 'bg-cyan-400 text-slate-950'
                  : 'border border-white/12 bg-[#080F1E] text-slate-300'
              }`}
            >
              {prefs.reducedMotion ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        {/* Data Management: Reset Progress */}
        <div className="mt-4 rounded-xl border border-white/10 bg-[#0C1424] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-white">
                Local Progress &amp; Data
              </div>
              <div className="text-[11px] text-slate-400">
                Reset coins, profiles, purchases, challenges, and match records
              </div>
            </div>
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => {
                  onButtonClick();
                  setConfirmReset(true);
                }}
                className="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-red-500/35 bg-red-500/10 px-3 text-xs font-bold text-red-300 hover:bg-red-500/20 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Progress</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onButtonClick();
                    setConfirmReset(false);
                  }}
                  className="min-h-[40px] rounded-lg border border-white/15 px-3 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onButtonClick();
                    onResetAllProgress();
                    setConfirmReset(false);
                  }}
                  className="min-h-[40px] rounded-lg bg-red-500 px-3 text-xs font-bold text-white hover:bg-red-400 cursor-pointer"
                >
                  Confirm Reset
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <PWAInstallButton onAction={onButtonClick} />
          <button
            type="button"
            onClick={() => {
              onButtonClick();
              onBack();
            }}
            className="ml-auto min-h-[44px] rounded-xl bg-cyan-400 px-6 font-display text-sm font-extrabold text-slate-950 hover:bg-cyan-300 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
