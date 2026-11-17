import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Award,
  Coins,
  Home,
  Palette,
  RotateCcw,
  ShoppingBag,
  Trophy,
} from 'lucide-react';
import { animateResultsCardAndCoins } from '@/animations/timelines';
import { Preview3DViewport } from '@/features/customization/Preview3DViewport';
import { PlayerAvatarBadge } from '@/features/player-profiles/PlayerAvatarBadge';
import type {
  LiveMatchHUDState,
  MatchConfig,
  MatchRewardBreakdown,
  PlayerIdentity,
  ScreenId,
} from '@/types/game';
import { formatClock, formatDurationLabel } from '@/utils/format';

interface ResultsModalProps {
  hud: LiveMatchHUDState;
  config: MatchConfig;
  profiles: { p1: PlayerIdentity; p2: PlayerIdentity };
  reward: MatchRewardBreakdown | null;
  reducedMotion: boolean;
  seriesSummaryLabel?: string | null;
  seriesNextLabel?: string | null;
  onNextSeriesMatch?: () => void;
  onPlayAgain: () => void;
  onNavigate: (screen: ScreenId) => void;
  onMainMenu: () => void;
  onButtonClick: () => void;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({
  hud,
  config,
  profiles,
  reward,
  reducedMotion,
  seriesSummaryLabel,
  seriesNextLabel,
  onNextSeriesMatch,
  onPlayAgain,
  onNavigate,
  onMainMenu,
  onButtonClick,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [displayedCoins, setDisplayedCoins] = useState(0);

  const earnedTotal = reward?.p1TotalCoins ?? 0;

  useEffect(() => {
    const tween = animateResultsCardAndCoins(
      cardRef.current,
      earnedTotal,
      reducedMotion,
      setDisplayedCoins
    );
    return () => {
      tween?.kill();
    };
  }, [earnedTotal, reducedMotion]);

  const isAIMode =
    config.mode === 'vs_ai' ||
    config.mode === 'time_challenge' ||
    config.mode === 'best_of_three' ||
    config.mode === 'tournament';

  const p1Name = profiles.p1.name || config.player1Name || 'Player 1';
  const p2Name = isAIMode
    ? `Arena AI (${config.difficulty.toUpperCase()})`
    : config.mode === 'practice'
    ? 'Practice Drill'
    : profiles.p2.name || config.player2Name || 'Player 2';

  const isDraw = hud.winner === 'draw';
  const winnerProfile = hud.winner === 'p2' ? profiles.p2 : profiles.p1;
  const winnerTitle = isDraw
    ? 'Match Draw'
    : hud.winner === 'p1'
    ? `${p1Name} Wins!`
    : `${p2Name} Wins!`;

  const accentClass = isDraw
    ? 'text-white'
    : hud.winner === 'p1'
    ? 'text-cyan-300'
    : 'text-orange-400';

  const durationFormatted =
    config.mode === 'practice'
      ? 'Free Play'
      : hud.elapsedSeconds > 0
      ? formatClock(Math.round(hud.elapsedSeconds))
      : formatDurationLabel(config.durationSeconds, false, 'Free Play');

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/82 p-3 sm:p-5 overflow-y-auto">
      <div
        ref={cardRef}
        className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#070B14] p-5 sm:p-7 shadow-2xl max-h-[94vh] overflow-y-auto"
      >
        {/* Top Victory / Draw Banner */}
        <div className="flex flex-col items-center text-center">
          {isDraw ? (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-slate-500 bg-slate-800/70 text-slate-100">
              <Award className="w-8 h-8" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <PlayerAvatarBadge
                avatarId={winnerProfile.avatarId}
                colorHex={winnerProfile.avatarColor}
                size="lg"
              />
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl border ${
                  hud.winner === 'p1'
                    ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-300'
                    : 'border-orange-500/50 bg-orange-500/15 text-orange-400'
                }`}
              >
                <Trophy className="w-6 h-6" />
              </div>
            </div>
          )}

          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-400">
            {seriesSummaryLabel ||
              (isDraw ? 'Tie Game · Overtime Ready' : 'Victory Celebration')}
          </p>
          <h2 className={`mt-1 font-display text-3xl font-extrabold ${accentClass}`}>
            {winnerTitle}
          </h2>
        </div>

        {/* Split: Score & Coins Breakdown + Selected Striker 3D Showcase */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-7 space-y-3">
            {/* Final Scoreboard */}
            <div className="grid grid-cols-3 items-center rounded-xl border border-white/12 bg-[#0C1424] p-3.5 text-center">
              <div className="min-w-0">
                <div className="truncate text-[11px] font-bold uppercase text-cyan-400">
                  {p1Name}
                </div>
                <div className="mt-0.5 font-mono-tabular text-4xl font-extrabold text-white">
                  {hud.score1}
                </div>
              </div>
              <div className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                vs
              </div>
              <div className="min-w-0">
                <div className="truncate text-[11px] font-bold uppercase text-orange-400">
                  {p2Name}
                </div>
                <div className="mt-0.5 font-mono-tabular text-4xl font-extrabold text-white">
                  {hud.score2}
                </div>
              </div>
            </div>

            {/* Match Metrics */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/10 bg-[#0C1424] p-2.5 text-center">
                <div className="text-[10px] text-slate-400">Duration</div>
                <div className="mt-0.5 font-mono-tabular text-sm font-bold text-white">
                  {durationFormatted}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0C1424] p-2.5 text-center">
                <div className="text-[10px] text-slate-400">Top Speed</div>
                <div className="mt-0.5 font-mono-tabular text-sm font-bold text-amber-300">
                  {hud.topSpeedKmh} km/h
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0C1424] p-2.5 text-center">
                <div className="text-[10px] text-slate-400">Hits</div>
                <div className="mt-0.5 font-mono-tabular text-sm font-bold text-white">
                  {hud.totalHits}
                </div>
              </div>
            </div>

            {/* Coins Earned & Bonus Rewards */}
            {config.mode !== 'practice' && reward && (
              <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-300" />
                    <span className="font-display text-sm font-extrabold text-white">
                      Coins Earned
                    </span>
                  </div>
                  <span className="font-mono-tabular text-2xl font-extrabold text-amber-300">
                    +{displayedCoins}
                  </span>
                </div>

                <div className="mt-2 space-y-1 border-t border-white/10 pt-2 text-xs text-slate-200">
                  <div className="flex justify-between">
                    <span>Match Reward</span>
                    <span className="font-mono-tabular font-bold text-amber-200">
                      +{reward.p1BaseCoins}
                    </span>
                  </div>
                  {reward.p1CleanSheetBonus > 0 && (
                    <div className="flex justify-between text-cyan-300">
                      <span>Clean Sheet Bonus</span>
                      <span className="font-mono-tabular font-bold">
                        +{reward.p1CleanSheetBonus}
                      </span>
                    </div>
                  )}
                  {reward.p1StreakBonus > 0 && (
                    <div className="flex justify-between text-orange-300">
                      <span>3-Win Streak Bonus</span>
                      <span className="font-mono-tabular font-bold">
                        +{reward.p1StreakBonus}
                      </span>
                    </div>
                  )}
                  {reward.challengeCoinsAwarded > 0 && (
                    <div className="flex justify-between text-emerald-300">
                      <span>Daily Challenge Complete</span>
                      <span className="font-mono-tabular font-bold">
                        +{reward.challengeCoinsAwarded}
                      </span>
                    </div>
                  )}
                  {config.mode === 'two_player' && reward.p2TotalCoins > 0 && (
                    <div className="flex justify-between text-orange-300">
                      <span>{p2Name} Coins</span>
                      <span className="font-mono-tabular font-bold">
                        +{reward.p2TotalCoins}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Winner / Player Selected Striker 3D Showcase */}
          <div className="sm:col-span-5 flex flex-col rounded-xl border border-white/12 bg-[#05070C] overflow-hidden">
            <Preview3DViewport
              mode="striker"
              strikerStyle={winnerProfile.strikerId}
              strikerColor={winnerProfile.strikerColorId}
              customColorHex={winnerProfile.customColorHex}
              className="h-44 sm:h-full min-h-[180px] w-full"
            />
            <div className="border-t border-white/10 bg-[#0C1424] px-3 py-2 text-center text-[11px] font-bold text-slate-300">
              {isDraw ? `${p1Name}'s Striker` : `${winnerProfile.name}'s Striker`}
            </div>
          </div>
        </div>

        {/* Action Buttons: NEXT / PLAY AGAIN | CUSTOMIZE | VISIT STORE | MAIN MENU */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {seriesNextLabel && onNextSeriesMatch ? (
            <button
              type="button"
              onClick={() => {
                onButtonClick();
                onNextSeriesMatch();
              }}
              className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-cyan-400 px-2 font-display text-xs sm:text-sm font-extrabold text-slate-950 hover:bg-cyan-300 cursor-pointer"
            >
              <span className="truncate">{seriesNextLabel}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onButtonClick();
                onPlayAgain();
              }}
              className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-cyan-400 font-display text-xs sm:text-sm font-extrabold text-slate-950 hover:bg-cyan-300 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>PLAY AGAIN</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onButtonClick();
              onNavigate('customize');
            }}
            className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-[#0C1424] text-xs sm:text-sm font-bold text-white hover:border-cyan-400/60 cursor-pointer"
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
            className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-amber-400/35 bg-amber-500/12 text-xs sm:text-sm font-bold text-amber-300 hover:border-amber-400 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span>VISIT STORE</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onButtonClick();
              onMainMenu();
            }}
            className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-[#0E1729] text-xs sm:text-sm font-bold text-slate-200 hover:text-white cursor-pointer"
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
