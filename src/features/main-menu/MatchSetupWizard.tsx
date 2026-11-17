import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Bot,
  Clock,
  Flame,
  Gauge,
  Play,
  Sparkles,
  Target,
  Trophy,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react';
import type {
  AIDifficulty,
  GameMode,
  GameplaySpeedPreset,
  MatchConfig,
  ScreenId,
} from '@/types/game';

interface MatchSetupWizardProps {
  activeScreen: 'setup_mode' | 'setup_players' | 'setup_duration' | 'setup_difficulty';
  config: MatchConfig;
  onUpdateConfig: (next: MatchConfig) => void;
  onNavigate: (screen: ScreenId) => void;
  onStartMatch: () => void;
  onButtonClick: () => void;
}

const PRESET_DURATIONS = [
  { label: '1 Min', seconds: 60 },
  { label: '2 Min', seconds: 120 },
  { label: '3 Min', seconds: 180 },
  { label: '5 Min', seconds: 300 },
  { label: '10 Min', seconds: 600 },
];

const WINNING_SCORE_PRESETS = [
  { label: 'First to 3', value: 3 },
  { label: 'First to 5', value: 5 },
  { label: 'First to 7', value: 7 },
  { label: 'First to 10', value: 10 },
  { label: 'Timer Only', value: 0 },
];

const GAMEPLAY_SPEED_OPTIONS: Array<{
  id: GameplaySpeedPreset;
  label: string;
}> = [
  { id: 'slow', label: 'Slow' },
  { id: 'normal', label: 'Normal' },
  { id: 'fast', label: 'Fast' },
];

export const MatchSetupWizard: React.FC<MatchSetupWizardProps> = ({
  activeScreen,
  config,
  onUpdateConfig,
  onNavigate,
  onStartMatch,
  onButtonClick,
}) => {
  const [customMinutes, setCustomMinutes] = useState(
    String(config.customDurationMinutes || 4)
  );

  useEffect(() => {
    setCustomMinutes(String(config.customDurationMinutes || 4));
  }, [config.customDurationMinutes]);

  const isCustomSelected = !PRESET_DURATIONS.some(
    (p) => p.seconds === config.durationSeconds
  );

  const isAIMode =
    config.mode === 'vs_ai' ||
    config.mode === 'time_challenge' ||
    config.mode === 'best_of_three' ||
    config.mode === 'tournament';

  const supportsDifficultySelect =
    config.mode === 'vs_ai' ||
    config.mode === 'time_challenge' ||
    config.mode === 'best_of_three';

  const tabs: Array<{ id: MatchSetupWizardProps['activeScreen']; label: string }> = [
    { id: 'setup_mode', label: 'Mode' },
    { id: 'setup_players', label: 'Players' },
    ...(config.mode !== 'practice'
      ? [{ id: 'setup_duration' as const, label: 'Rules & Speed' }]
      : []),
    ...(supportsDifficultySelect
      ? [{ id: 'setup_difficulty' as const, label: 'Difficulty' }]
      : []),
  ];

  const currentTabIdx = tabs.findIndex((t) => t.id === activeScreen);
  const hasNext = currentTabIdx >= 0 && currentTabIdx < tabs.length - 1;

  const selectMode = (mode: GameMode) => {
    onButtonClick();
    onUpdateConfig({ ...config, mode });
  };

  const selectDifficulty = (difficulty: AIDifficulty) => {
    onButtonClick();
    onUpdateConfig({ ...config, difficulty });
  };

  const applyCustomDuration = (valStr: string) => {
    setCustomMinutes(valStr);
    const parsed = parseFloat(valStr);
    if (!Number.isNaN(parsed) && parsed >= 0.5 && parsed <= 30) {
      onUpdateConfig({
        ...config,
        customDurationMinutes: parsed,
        durationSeconds: Math.round(parsed * 60),
      });
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#070B14] p-5 sm:p-7 shadow-2xl max-h-[94vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onButtonClick();
              onNavigate('menu');
            }}
            className="flex min-h-[44px] items-center gap-2 rounded-lg border border-white/10 bg-[#0E1729] px-3 text-xs font-semibold text-slate-200 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Menu</span>
          </button>
          <h2 className="font-display text-xl font-bold text-white">
            Match Setup
          </h2>
          <div className="w-16" />
        </div>

        {/* Step / Screen Navigation Bar */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-1.5 rounded-xl bg-[#050912] p-1.5 border border-white/10">
          {tabs.map((tab) => {
            const active = tab.id === activeScreen;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  onButtonClick();
                  onNavigate(tab.id);
                }}
                className={`min-h-[40px] rounded-lg px-3 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-cyan-400 text-slate-950'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Game Mode Selection */}
        {activeScreen === 'setup_mode' && (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-slate-300">
              Choose how you want to play on the table.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => selectMode('two_player')}
                className={`flex items-start gap-3.5 rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                  config.mode === 'two_player'
                    ? 'border-cyan-400 bg-cyan-500/12'
                    : 'border-white/10 bg-[#0C1424] hover:border-white/25'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-display text-sm font-bold text-white">
                    Two Player Local
                  </div>
                  <p className="mt-0.5 text-xs text-slate-300">
                    Face-to-face on one screen with simultaneous multi-touch tracking.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => selectMode('vs_ai')}
                className={`flex items-start gap-3.5 rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                  config.mode === 'vs_ai'
                    ? 'border-red-500 bg-red-500/12'
                    : 'border-white/10 bg-[#0C1424] hover:border-white/25'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-red-400">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-display text-sm font-bold text-white">
                    Play Against AI
                  </div>
                  <p className="mt-0.5 text-xs text-slate-300">
                    Single arcade match across Beginner to Expert AI tiers.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => selectMode('time_challenge')}
                className={`flex items-start gap-3.5 rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                  config.mode === 'time_challenge'
                    ? 'border-amber-400 bg-amber-500/12'
                    : 'border-white/10 bg-[#0C1424] hover:border-white/25'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-display text-sm font-bold text-white">
                    Time Rush
                  </div>
                  <p className="mt-0.5 text-xs text-slate-300">
                    Fast 0.65s face-offs — rack up maximum goals before 00:00.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => selectMode('best_of_three')}
                className={`flex items-start gap-3.5 rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                  config.mode === 'best_of_three'
                    ? 'border-emerald-400 bg-emerald-500/12'
                    : 'border-white/10 bg-[#0C1424] hover:border-white/25'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-display text-sm font-bold text-white">
                    Best of Three
                  </div>
                  <p className="mt-0.5 text-xs text-slate-300">
                    First player to win 2 full rounds claims the championship series.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => selectMode('tournament')}
                className={`flex items-start gap-3.5 rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                  config.mode === 'tournament'
                    ? 'border-purple-400 bg-purple-500/12'
                    : 'border-white/10 bg-[#0C1424] hover:border-white/25'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-display text-sm font-bold text-white">
                    Arcade Tournament
                  </div>
                  <p className="mt-0.5 text-xs text-slate-300">
                    3-stage AI bracket: Quarterfinal (Easy) → Semifinal (Hard) → Final (Expert).
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => selectMode('practice')}
                className={`flex items-start gap-3.5 rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                  config.mode === 'practice'
                    ? 'border-cyan-400 bg-cyan-500/12'
                    : 'border-white/10 bg-[#0C1424] hover:border-white/25'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-700/60 text-cyan-300">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-display text-sm font-bold text-white">
                    Practice Mode
                  </div>
                  <p className="mt-0.5 text-xs text-slate-300">
                    No match clock. Adjust puck speed, toggle a sparring bot, and drill bank shots.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Player Name Selection */}
        {activeScreen === 'setup_players' && (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-slate-300">
              Set player display names for the live scoreboard and match records.
            </p>
            <div>
              <label
                htmlFor="p1-name-input"
                className="flex items-center gap-2 text-xs font-semibold text-cyan-300"
              >
                <UserCheck className="w-4 h-4" />
                <span>Player 1 Name (Bottom / Left Cyan Side)</span>
              </label>
              <input
                id="p1-name-input"
                type="text"
                maxLength={18}
                value={config.player1Name}
                onChange={(e) =>
                  onUpdateConfig({
                    ...config,
                    player1Name: e.target.value,
                  })
                }
                placeholder="Player 1"
                className="mt-2 w-full min-h-[46px] rounded-xl border border-white/15 bg-[#050912] px-4 text-sm font-medium text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="p2-name-input"
                className="flex items-center gap-2 text-xs font-semibold text-orange-300"
              >
                <UserCheck className="w-4 h-4" />
                <span>
                  {isAIMode
                    ? 'AI Opponent Name (Top / Right Side)'
                    : 'Player 2 Name (Top / Right Side)'}
                </span>
              </label>
              <input
                id="p2-name-input"
                type="text"
                maxLength={18}
                disabled={isAIMode}
                value={
                  config.mode === 'tournament'
                    ? 'Tournament Bracket AI (Escalating)'
                    : isAIMode
                    ? `Arena AI (${config.difficulty.toUpperCase()})`
                    : config.player2Name
                }
                onChange={(e) =>
                  onUpdateConfig({
                    ...config,
                    player2Name: e.target.value,
                  })
                }
                placeholder="Player 2"
                className="mt-2 w-full min-h-[46px] rounded-xl border border-white/15 bg-[#05070C] px-4 text-sm font-medium text-white focus:border-orange-400 focus:outline-none disabled:opacity-60"
              />
            </div>
          </div>
        )}

        {/* Match Duration, Target Score, Speed & Power-Ups */}
        {activeScreen === 'setup_duration' && (
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Select match duration or enter custom minutes.</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {PRESET_DURATIONS.map((preset) => {
                const selected = config.durationSeconds === preset.seconds;
                return (
                  <button
                    key={preset.seconds}
                    type="button"
                    onClick={() => {
                      onButtonClick();
                      onUpdateConfig({
                        ...config,
                        durationSeconds: preset.seconds,
                      });
                    }}
                    className={`min-h-[46px] rounded-xl border font-mono-tabular text-sm font-bold transition-colors cursor-pointer ${
                      selected
                        ? 'border-cyan-400 bg-cyan-500/18 text-white'
                        : 'border-white/10 bg-[#0C1424] text-slate-300 hover:border-white/25'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}

              <div
                className={`flex items-center justify-between rounded-xl border px-3 min-h-[46px] ${
                  isCustomSelected
                    ? 'border-red-400 bg-red-500/12'
                    : 'border-white/10 bg-[#0C1424]'
                }`}
              >
                <label
                  htmlFor="custom-minutes"
                  className="text-xs font-semibold text-slate-300"
                >
                  Custom
                </label>
                <input
                  id="custom-minutes"
                  type="number"
                  min={0.5}
                  max={30}
                  step={0.5}
                  value={customMinutes}
                  onFocus={() => applyCustomDuration(customMinutes)}
                  onChange={(e) => applyCustomDuration(e.target.value)}
                  className="w-14 bg-transparent text-right font-mono-tabular text-sm font-bold text-white focus:outline-none"
                />
                <span className="ml-1 text-xs text-slate-400">m</span>
              </div>
            </div>

            {/* Winning Score Target */}
            <div className="border-t border-white/10 pt-3.5">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Winning Score Target</span>
              </div>
              {config.mode === 'time_challenge' ? (
                <p className="mt-1.5 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200">
                  Time Rush mode ignores goal caps — score as many goals as possible before the clock hits 00:00.
                </p>
              ) : (
                <>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Match ends early when a player reaches the goal target, or play full time.
                  </p>
                  <div className="mt-2.5 grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {WINNING_SCORE_PRESETS.map((preset) => {
                      const selected = config.winningScore === preset.value;
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => {
                            onButtonClick();
                            onUpdateConfig({
                              ...config,
                              winningScore: preset.value,
                            });
                          }}
                          className={`min-h-[42px] rounded-xl border px-2 text-xs font-bold transition-colors cursor-pointer ${
                            selected
                              ? 'border-amber-400 bg-amber-500/18 text-amber-200'
                              : 'border-white/10 bg-[#0C1424] text-slate-300 hover:border-white/25'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Gameplay Speed & Power-Ups */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-white/10 pt-3.5">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Gameplay Speed</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {GAMEPLAY_SPEED_OPTIONS.map((opt) => {
                    const selected = config.gameplaySpeed === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onButtonClick();
                          onUpdateConfig({ ...config, gameplaySpeed: opt.id });
                        }}
                        className={`min-h-[40px] rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                          selected
                            ? 'border-cyan-400 bg-cyan-500/20 text-white'
                            : 'border-white/10 bg-[#0C1424] text-slate-300 hover:border-white/25'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Arena Power-Ups</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onButtonClick();
                    onUpdateConfig({
                      ...config,
                      powerUpsEnabled: !config.powerUpsEnabled,
                    });
                  }}
                  className={`mt-2 w-full min-h-[40px] flex items-center justify-between rounded-lg border px-3 text-xs font-bold transition-colors cursor-pointer ${
                    config.powerUpsEnabled
                      ? 'border-yellow-400/70 bg-yellow-500/15 text-yellow-200'
                      : 'border-white/10 bg-[#0C1424] text-slate-300 hover:border-white/25'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>{config.powerUpsEnabled ? 'Power-Ups Active' : 'Classic Pure Rules'}</span>
                  </span>
                  <span className="rounded bg-black/35 px-2 py-0.5 text-[10px] uppercase">
                    {config.powerUpsEnabled ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Difficulty Selection */}
        {activeScreen === 'setup_difficulty' && (
          <div className="mt-5 space-y-2">
            <p className="text-sm text-slate-300">
              Choose the AI opponent&apos;s reaction speed and offensive precision.
            </p>
            {(
              [
                {
                  id: 'beginner',
                  title: 'Beginner',
                  desc: 'Gentle starter pace with forgiving defensive positioning.',
                },
                {
                  id: 'easy',
                  title: 'Easy',
                  desc: 'Relaxed arcade pace, wider reaction windows, great for warm-up.',
                },
                {
                  id: 'medium',
                  title: 'Medium',
                  desc: 'Balanced arcade challenge with wall-bank tracking and steady defense.',
                },
                {
                  id: 'hard',
                  title: 'Hard',
                  desc: 'Fast predictive intercepts and sharp angled counter-strikes.',
                },
                {
                  id: 'expert',
                  title: 'Expert',
                  desc: 'Pro-arcade speed, tight corner targeting, and relentless pressure.',
                },
              ] as const
            ).map((item) => {
              const selected = config.difficulty === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectDifficulty(item.id)}
                  className={`w-full rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                    selected
                      ? 'border-red-500 bg-red-500/15'
                      : 'border-white/10 bg-[#0C1424] hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm sm:text-base font-bold text-white">
                      {item.title}
                    </span>
                    <span className="text-xs font-semibold text-red-400">
                      {selected ? 'Selected' : ''}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-300">{item.desc}</p>
                </button>
              );
            })}
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
          {hasNext ? (
            <button
              type="button"
              onClick={() => {
                onButtonClick();
                onNavigate(tabs[currentTabIdx + 1].id);
              }}
              className="flex min-h-[46px] items-center gap-2 rounded-xl border border-white/15 bg-[#0E1729] px-4 text-sm font-semibold text-white hover:border-cyan-400/50 cursor-pointer"
            >
              <span>Next: {tabs[currentTabIdx + 1].label}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={() => {
              onButtonClick();
              onStartMatch();
            }}
            className="flex min-h-[48px] items-center gap-2 rounded-xl bg-cyan-400 px-6 font-display text-sm font-extrabold text-slate-950 transition-transform hover:bg-cyan-300 active:scale-[0.98] cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>Start Match</span>
          </button>
        </div>
      </div>
    </div>
  );
};

