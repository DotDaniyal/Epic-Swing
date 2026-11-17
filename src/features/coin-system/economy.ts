import { ECONOMY_REWARDS } from '@/config/catalog';
import {
  ensureDailyChallengesCurrent,
  saveAllData,
} from '@/storage/localStorage';
import type {
  EpicSwingSaveData,
  MatchRecord,
  MatchRewardBreakdown,
  PlayerStatistics,
} from '@/types/game';

export function processCompletedMatchRewards(
  currentSave: EpicSwingSaveData,
  record: MatchRecord
): { nextSave: EpicSwingSaveData; reward: MatchRewardBreakdown } {
  const freshSave = ensureDailyChallengesCurrent(currentSave);

  // Prevent duplicate coin rewards for the same matchId
  if (freshSave.rewardedMatchIds.includes(record.id)) {
    return {
      nextSave: freshSave,
      reward: {
        matchId: record.id,
        p1BaseCoins: 0,
        p1CleanSheetBonus: 0,
        p1StreakBonus: 0,
        p1TotalCoins: 0,
        p2TotalCoins: 0,
        newlyCompletedChallengeIds: [],
        challengeCoinsAwarded: 0,
        alreadyRewarded: true,
      },
    };
  }

  const p1 = { ...freshSave.profiles.p1 };
  const p2 = { ...freshSave.profiles.p2 };

  p1.matchesPlayed += 1;
  p1.highestScore = Math.max(p1.highestScore, record.score1);
  p1.fastestShotKmh = Math.max(p1.fastestShotKmh, record.topSpeedKmh);

  let p1BaseCoins = 0;
  let p1CleanSheetBonus = 0;
  let p1StreakBonus = 0;

  if (record.winner === 'p1') {
    p1.matchesWon += 1;
    p1.winStreak += 1;
    p1.bestWinStreak = Math.max(p1.bestWinStreak, p1.winStreak);
    p1BaseCoins = ECONOMY_REWARDS.WIN_MATCH;
    if (record.score2 === 0) {
      p1CleanSheetBonus = ECONOMY_REWARDS.CLEAN_SHEET_BONUS;
    }
    if (p1.winStreak > 0 && p1.winStreak % 3 === 0) {
      p1StreakBonus = ECONOMY_REWARDS.THREE_WIN_STREAK_BONUS;
    }
  } else if (record.winner === 'draw') {
    p1.matchesDrawn += 1;
    p1.winStreak = 0;
    p1BaseCoins = ECONOMY_REWARDS.DRAW_MATCH;
  } else {
    p1.matchesLost += 1;
    p1.winStreak = 0;
    p1BaseCoins = ECONOMY_REWARDS.LOSS_MATCH;
  }

  let p2TotalCoins = 0;
  if (record.mode === 'two_player') {
    p2.matchesPlayed += 1;
    p2.highestScore = Math.max(p2.highestScore, record.score2);
    p2.fastestShotKmh = Math.max(p2.fastestShotKmh, record.topSpeedKmh);
    if (record.winner === 'p2') {
      p2.matchesWon += 1;
      p2.winStreak += 1;
      p2.bestWinStreak = Math.max(p2.bestWinStreak, p2.winStreak);
      p2TotalCoins += ECONOMY_REWARDS.WIN_MATCH;
      if (record.score1 === 0) p2TotalCoins += ECONOMY_REWARDS.CLEAN_SHEET_BONUS;
      if (p2.winStreak > 0 && p2.winStreak % 3 === 0) {
        p2TotalCoins += ECONOMY_REWARDS.THREE_WIN_STREAK_BONUS;
      }
    } else if (record.winner === 'draw') {
      p2.matchesDrawn += 1;
      p2.winStreak = 0;
      p2TotalCoins += ECONOMY_REWARDS.DRAW_MATCH;
    } else {
      p2.matchesLost += 1;
      p2.winStreak = 0;
      p2TotalCoins += ECONOMY_REWARDS.LOSS_MATCH;
    }
  }

  const newlyCompletedChallengeIds: string[] = [];
  let challengeCoinsAwarded = 0;

  const updatedChallenges = freshSave.dailyChallenges.challenges.map((ch) => {
    let nextProgress = ch.progress;
    if (ch.id === 'win_1' || ch.id === 'win_2') {
      if (record.winner === 'p1') nextProgress = Math.min(ch.target, ch.progress + 1);
    } else if (ch.id === 'score_5') {
      nextProgress = Math.min(ch.target, ch.progress + record.score1);
    } else if (ch.id === 'play_3') {
      nextProgress = Math.min(ch.target, ch.progress + 1);
    }

    let claimed = ch.claimed;
    if (!claimed && nextProgress >= ch.target) {
      claimed = true;
      newlyCompletedChallengeIds.push(ch.id);
      challengeCoinsAwarded += ch.rewardCoins;
    }

    return { ...ch, progress: nextProgress, claimed };
  });

  const p1MatchCoins = p1BaseCoins + p1CleanSheetBonus + p1StreakBonus;
  const p1TotalCoins = p1MatchCoins + challengeCoinsAwarded;
  p1.coins = Math.max(0, p1.coins + p1TotalCoins);
  p2.coins = Math.max(0, p2.coins + p2TotalCoins);

  const enrichedRecord: MatchRecord = {
    ...record,
    p1CoinsEarned: p1TotalCoins,
    p2CoinsEarned: p2TotalCoins,
  };

  const nextStats: PlayerStatistics = {
    totalMatches: freshSave.statistics.totalMatches + 1,
    p1Wins: freshSave.statistics.p1Wins + (record.winner === 'p1' ? 1 : 0),
    p2Wins: freshSave.statistics.p2Wins + (record.winner === 'p2' ? 1 : 0),
    draws: freshSave.statistics.draws + (record.winner === 'draw' ? 1 : 0),
    aiWins:
      freshSave.statistics.aiWins +
      (record.mode === 'vs_ai' && record.winner === 'p1' ? 1 : 0),
    aiLosses:
      freshSave.statistics.aiLosses +
      (record.mode === 'vs_ai' && record.winner === 'p2' ? 1 : 0),
    totalGoalsScored:
      freshSave.statistics.totalGoalsScored + record.score1 + record.score2,
    bestSingleMatchScore: Math.max(
      freshSave.statistics.bestSingleMatchScore,
      record.score1,
      record.score2
    ),
    fastestShotKmh: Math.max(
      freshSave.statistics.fastestShotKmh,
      record.topSpeedKmh
    ),
    recentMatches: [enrichedRecord, ...freshSave.statistics.recentMatches].slice(
      0,
      25
    ),
  };

  const nextSave: EpicSwingSaveData = {
    ...freshSave,
    statistics: nextStats,
    profiles: { p1, p2 },
    dailyChallenges: {
      dateKey: freshSave.dailyChallenges.dateKey,
      challenges: updatedChallenges,
    },
    rewardedMatchIds: [...freshSave.rewardedMatchIds, record.id].slice(-80),
  };

  saveAllData(nextSave);

  return {
    nextSave,
    reward: {
      matchId: record.id,
      p1BaseCoins,
      p1CleanSheetBonus,
      p1StreakBonus,
      p1TotalCoins,
      p2TotalCoins,
      newlyCompletedChallengeIds,
      challengeCoinsAwarded,
      alreadyRewarded: false,
    },
  };
}
