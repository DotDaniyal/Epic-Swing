import type { DailyChallengeItem, StoreCategory } from '@/types/game';

export const ECONOMY_REWARDS = {
  WIN_MATCH: 100,
  LOSS_MATCH: 20,
  DRAW_MATCH: 50,
  CLEAN_SHEET_BONUS: 50,
  THREE_WIN_STREAK_BONUS: 100,
  DAILY_CHALLENGE_BASE: 75,
} as const;

export const itemKey = (category: StoreCategory, id: string): string =>
  `${category}:${id}`;

export const DAILY_CHALLENGE_TEMPLATES: Array<
  Omit<DailyChallengeItem, 'progress' | 'claimed'>
> = [
  {
    id: 'win_1',
    title: 'First Blood',
    description: 'Win 1 match in 2P Local or vs AI',
    target: 1,
    rewardCoins: 75,
  },
  {
    id: 'score_5',
    title: 'Sharpshooter',
    description: 'Score 5 total goals today',
    target: 5,
    rewardCoins: 75,
  },
  {
    id: 'win_2',
    title: 'Double Victory',
    description: 'Win 2 matches today',
    target: 2,
    rewardCoins: 100,
  },
  {
    id: 'play_3',
    title: 'Arcade Regular',
    description: 'Complete 3 timed matches today',
    target: 3,
    rewardCoins: 75,
  },
];
