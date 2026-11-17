import React, { useState } from 'react';
import { ArrowLeft, Trash2, Trophy } from 'lucide-react';
import type { PlayerStatistics } from '@/types/game';

interface StatsScreenProps {
  stats: PlayerStatistics;
  onBack: () => void;
  onResetStats: () => void;
  onButtonClick: () => void;
}

export const StatsScreen: React.FC<StatsScreenProps> = ({
  stats,
  onBack,
  onResetStats,
  onButtonClick,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const winRate =
    stats.totalMatches > 0
      ? Math.round((stats.p1Wins / stats.totalMatches) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#070B14] p-5 sm:p-7 shadow-2xl max-h-[92vh] flex flex-col">
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
          <h2 className="font-display text-xl font-bold text-white">
            Match Statistics
          </h2>
          <div className="w-16" />
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/10 bg-[#0C1424] p-4">
            <div className="text-xs text-slate-400">Matches Played</div>
            <div className="mt-1 font-mono-tabular text-2xl font-bold text-white">
              {stats.totalMatches}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0C1424] p-4">
            <div className="text-xs text-slate-400">P1 Wins · Draws</div>
            <div className="mt-1 font-mono-tabular text-2xl font-bold text-cyan-300">
              {stats.p1Wins}{' '}
              <span className="text-base font-normal text-slate-400">
                · {stats.draws}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0C1424] p-4">
            <div className="text-xs text-slate-400">P1 Win Rate</div>
            <div className="mt-1 font-mono-tabular text-2xl font-bold text-white">
              {winRate}%
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0C1424] p-4">
            <div className="text-xs text-slate-400">vs AI Record</div>
            <div className="mt-1 font-mono-tabular text-xl font-bold text-white">
              {stats.aiWins}W – {stats.aiLosses}L
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0C1424] p-4">
            <div className="text-xs text-slate-400">Best Match Goals</div>
            <div className="mt-1 font-mono-tabular text-2xl font-bold text-amber-300">
              {stats.bestSingleMatchScore}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0C1424] p-4">
            <div className="text-xs text-slate-400">Fastest Shot</div>
            <div className="mt-1 font-mono-tabular text-2xl font-bold text-white">
              {stats.fastestShotKmh}{' '}
              <span className="text-xs font-normal text-slate-400">km/h</span>
            </div>
          </div>
        </div>

        {/* Recent Match History */}
        <div className="mt-5 flex-1 min-h-0 overflow-y-auto">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Recent Matches
          </h3>
          {stats.recentMatches.length === 0 ? (
            <div className="mt-3 rounded-xl border border-white/10 bg-[#050912] p-6 text-center text-sm text-slate-400">
              <Trophy className="mx-auto mb-2 w-6 h-6 text-slate-600" />
              Complete a timed match to record your statistics locally.
            </div>
          ) : (
            <div className="mt-2.5 space-y-2">
              {stats.recentMatches.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0C1424] px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-white">
                      {m.player1Name} vs {m.player2Name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {m.mode === 'vs_ai'
                        ? `vs AI (${m.difficulty ?? 'medium'})`
                        : '2P Local'}{' '}
                      · Peak {m.topSpeedKmh} km/h
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono-tabular text-base font-bold text-white">
                      <span className="text-cyan-300">{m.score1}</span>
                      <span className="mx-1 text-slate-500">:</span>
                      <span className="text-orange-400">{m.score2}</span>
                    </div>
                    <div className="text-[11px] font-medium text-slate-400">
                      {m.winner === 'draw'
                        ? 'Draw'
                        : m.winner === 'p1'
                        ? `${m.player1Name} won`
                        : `${m.player2Name} won`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Reset */}
        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
          <span className="text-xs text-slate-400">
            Saved locally on this device
          </span>
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => {
                onButtonClick();
                setConfirmReset(true);
              }}
              className="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/10 bg-[#0E1729] px-3 text-xs font-semibold text-slate-300 hover:border-red-500/40 hover:text-red-300 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Stats</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onButtonClick();
                  setConfirmReset(false);
                }}
                className="min-h-[40px] rounded-lg border border-white/10 px-3 text-xs font-semibold text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onButtonClick();
                  onResetStats();
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
    </div>
  );
};
