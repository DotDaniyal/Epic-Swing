import React, { useMemo, useState } from 'react';
import { ArrowLeft, Crown, Flame, Timer, Trash2, Trophy } from 'lucide-react';
import { PlayerAvatarBadge } from '@/features/player-profiles/PlayerAvatarBadge';
import type {
  GameMode,
  PlayerIdentity,
  PlayerStatistics,
} from '@/types/game';
import { formatClock } from '@/utils/format';

interface StatsScreenProps {
  stats: PlayerStatistics;
  profiles: { p1: PlayerIdentity; p2: PlayerIdentity };
  onBack: () => void;
  onResetStats: () => void;
  onButtonClick: () => void;
}

const MODE_LABELS: Record<GameMode, string> = {
  two_player: '2P Local',
  vs_ai: 'vs AI',
  practice: 'Practice',
  time_challenge: 'Time Rush',
  best_of_three: 'Best of 3',
  tournament: 'Tournament',
};

export const StatsScreen: React.FC<StatsScreenProps> = ({
  stats,
  profiles,
  onBack,
  onResetStats,
  onButtonClick,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const [tab, setTab] = useState<'overview' | 'leaderboard'>('overview');

  const winRate =
    stats.totalMatches > 0
      ? Math.round((stats.p1Wins / stats.totalMatches) * 100)
      : 0;

  const leaderboardEntries = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        wins: number;
        matches: number;
        bestScore: number;
        fastestShotKmh: number;
        bestStreak: number;
        isProfile: boolean;
        profile?: PlayerIdentity;
      }
    >();

    const seedProfile = (p: PlayerIdentity) => {
      map.set(p.name.toLowerCase(), {
        name: p.name,
        wins: p.matchesWon,
        matches: p.matchesPlayed,
        bestScore: p.highestScore,
        fastestShotKmh: p.fastestShotKmh,
        bestStreak: p.bestWinStreak,
        isProfile: true,
        profile: p,
      });
    };
    seedProfile(profiles.p1);
    seedProfile(profiles.p2);

    for (const m of stats.recentMatches) {
      const p2Key = m.player2Name.toLowerCase();
      if (!map.has(p2Key)) {
        map.set(p2Key, {
          name: m.player2Name,
          wins: 0,
          matches: 0,
          bestScore: 0,
          fastestShotKmh: 0,
          bestStreak: 0,
          isProfile: false,
        });
      }
      const opp = map.get(p2Key)!;
      if (!opp.isProfile) {
        opp.matches += 1;
        if (m.winner === 'p2') opp.wins += 1;
        opp.bestScore = Math.max(opp.bestScore, m.score2);
        opp.fastestShotKmh = Math.max(opp.fastestShotKmh, m.topSpeedKmh);
      }
    }

    return Array.from(map.values()).sort(
      (a, b) =>
        b.wins - a.wins ||
        b.bestStreak - a.bestStreak ||
        b.fastestShotKmh - a.fastestShotKmh
    );
  }, [profiles, stats.recentMatches]);

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
            Statistics &amp; Ranks
          </h2>
          <div className="w-16" />
        </div>

        {/* Sub-navigation Tabs */}
        <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-xl border border-white/10 bg-[#050912] p-1">
          <button
            type="button"
            onClick={() => {
              onButtonClick();
              setTab('overview');
            }}
            className={`min-h-[38px] rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              tab === 'overview'
                ? 'bg-cyan-400 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Overview &amp; History
          </button>
          <button
            type="button"
            onClick={() => {
              onButtonClick();
              setTab('leaderboard');
            }}
            className={`min-h-[38px] rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              tab === 'leaderboard'
                ? 'bg-cyan-400 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Local Leaderboard
          </button>
        </div>

        {tab === 'overview' ? (
          <>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="rounded-xl border border-white/10 bg-[#0C1424] p-3.5">
                <div className="text-[11px] text-slate-400">Matches</div>
                <div className="mt-1 font-mono-tabular text-xl font-bold text-white">
                  {stats.totalMatches}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#0C1424] p-3.5">
                <div className="text-[11px] text-slate-400">P1 Wins · Draws</div>
                <div className="mt-1 font-mono-tabular text-xl font-bold text-cyan-300">
                  {stats.p1Wins}{' '}
                  <span className="text-sm font-normal text-slate-400">
                    · {stats.draws}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#0C1424] p-3.5">
                <div className="text-[11px] text-slate-400">Win Rate</div>
                <div className="mt-1 font-mono-tabular text-xl font-bold text-white">
                  {winRate}%
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#0C1424] p-3.5">
                <div className="text-[11px] text-slate-400">vs AI Record</div>
                <div className="mt-1 font-mono-tabular text-lg font-bold text-white">
                  {stats.aiWins}W – {stats.aiLosses}L
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#0C1424] p-3.5">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span>Longest Streak</span>
                </div>
                <div className="mt-1 font-mono-tabular text-xl font-bold text-orange-300">
                  {stats.longestWinStreak}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#0C1424] p-3.5">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Timer className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Best Win Time</span>
                </div>
                <div className="mt-1 font-mono-tabular text-xl font-bold text-cyan-200">
                  {stats.bestMatchTimeSeconds !== null
                    ? formatClock(stats.bestMatchTimeSeconds)
                    : '—'}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#0C1424] p-3.5">
                <div className="text-[11px] text-slate-400">Best Score</div>
                <div className="mt-1 font-mono-tabular text-xl font-bold text-amber-300">
                  {stats.bestSingleMatchScore}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#0C1424] p-3.5">
                <div className="text-[11px] text-slate-400">Fastest Shot</div>
                <div className="mt-1 font-mono-tabular text-xl font-bold text-white">
                  {stats.fastestShotKmh}{' '}
                  <span className="text-[11px] font-normal text-slate-400">km/h</span>
                </div>
              </div>
            </div>

            {/* Recent Match History */}
            <div className="mt-4 flex-1 min-h-0 overflow-y-auto">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Recent Matches
              </h3>
              {stats.recentMatches.length === 0 ? (
                <div className="mt-3 rounded-xl border border-white/10 bg-[#050912] p-6 text-center text-sm text-slate-400">
                  <Trophy className="mx-auto mb-2 w-6 h-6 text-slate-600" />
                  Complete a match to record your statistics locally.
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
                          {MODE_LABELS[m.mode] ?? m.mode}
                          {m.difficulty ? ` (${m.difficulty})` : ''} · Peak{' '}
                          {m.topSpeedKmh} km/h
                          {typeof m.elapsedSeconds === 'number'
                            ? ` · ${formatClock(m.elapsedSeconds)}`
                            : ''}
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
          </>
        ) : (
          <div className="mt-4 flex-1 min-h-0 overflow-y-auto space-y-2.5">
            {leaderboardEntries.map((entry, idx) => {
              const rate =
                entry.matches > 0
                  ? Math.round((entry.wins / entry.matches) * 100)
                  : 0;
              return (
                <div
                  key={`${entry.name}-${idx}`}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                    idx === 0
                      ? 'border-amber-400/45 bg-amber-500/10'
                      : 'border-white/10 bg-[#0C1424]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono-tabular text-sm font-extrabold ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-950'
                          : idx === 2
                          ? 'bg-orange-400 text-slate-950'
                          : 'bg-[#050912] text-slate-400'
                      }`}
                    >
                      {idx === 0 ? <Crown className="w-4 h-4" /> : `#${idx + 1}`}
                    </div>
                    {entry.profile && (
                      <PlayerAvatarBadge
                        avatarId={entry.profile.avatarId}
                        colorHex={entry.profile.avatarColor}
                        size="sm"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-display text-sm font-bold text-white">
                        {entry.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {entry.matches} matches · {rate}% win · Streak{' '}
                        {entry.bestStreak}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono-tabular text-base font-extrabold text-cyan-300">
                      {entry.wins}W
                    </div>
                    <div className="font-mono-tabular text-[11px] text-slate-400">
                      {entry.fastestShotKmh} km/h
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
