import { DAILY_CHALLENGE_TEMPLATES, itemKey } from '@/config/catalog';
import type {
  DailyChallengesState,
  EpicSwingSaveData,
  MatchConfig,
  PlayerIdentity,
  PlayerStatistics,
  UserPreferences,
} from '@/types/game';

export const SAVE_KEY = 'epic_swing_save_v2';
export const CURRENT_SAVE_VERSION = 2;

export const LEGACY_KEYS = {
  MATCH_CONFIG: 'apex_rink_match_config_v1',
  PREFERENCES: 'apex_rink_preferences_v1',
  STATISTICS: 'apex_rink_statistics_v1',
} as const;

export function getLocalDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDefaultReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  );
}

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  mode: 'vs_ai',
  difficulty: 'medium',
  gameplaySpeed: 'normal',
  durationSeconds: 180,
  customDurationMinutes: 4,
  winningScore: 7,
  player1Name: 'Player 1',
  player2Name: 'Player 2',
  practiceSpeedMultiplier: 1.0,
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  sfxEnabled: true,
  sfxVolume: 0.8,
  musicEnabled: true,
  musicVolume: 0.35,
  muteAll: false,
  vibrationEnabled: true,
  quality: 'auto',
  cameraView: 'broadcast',
  reducedMotion: getDefaultReducedMotion(),
  mirrorTopScoreOnMobile: true,
  introPreference: 'auto',
  hasSeenIntro: false,
  touchSensitivity: 1.0,
};

export const DEFAULT_STATISTICS: PlayerStatistics = {
  totalMatches: 0,
  p1Wins: 0,
  p2Wins: 0,
  draws: 0,
  aiWins: 0,
  aiLosses: 0,
  totalGoalsScored: 0,
  bestSingleMatchScore: 0,
  fastestShotKmh: 0,
  recentMatches: [],
};

export const BASE_OWNED_ITEMS: string[] = [
  itemKey('strikers', 'classic'),
  itemKey('strikers', 'neon_cyan'),
  itemKey('strikers', 'fiery_orange'),
  itemKey('colors', 'cyan'),
  itemKey('colors', 'orange'),
  itemKey('colors', 'red'),
  itemKey('themes', 'classic_arcade'),
  itemKey('avatars', 'striker_ace'),
  itemKey('avatars', 'cyber_visor'),
  itemKey('avatars', 'flame_fox'),
  itemKey('vfx', 'silver_stream'),
  itemKey('goal_fx', 'arcade_flash'),
  itemKey('pucks', 'tournament_pro'),
  itemKey('backgrounds', 'midnight_arcade'),
];

export function createDefaultProfile(id: 'p1' | 'p2'): PlayerIdentity {
  return {
    id,
    name: id === 'p1' ? 'Player 1' : 'Player 2',
    avatarId: id === 'p1' ? 'striker_ace' : 'flame_fox',
    avatarColor: id === 'p1' ? '#00D8F6' : '#FF6B1A',
    strikerId: id === 'p1' ? 'neon_cyan' : 'fiery_orange',
    strikerColorId: id === 'p1' ? 'cyan' : 'orange',
    customColorHex: id === 'p1' ? '#00E5FF' : '#FF6B1A',
    tableThemeId: 'classic_arcade',
    trailEffectId: 'silver_stream',
    goalEffectId: 'arcade_flash',
    puckSkinId: 'tournament_pro',
    arenaBgId: 'midnight_arcade',
    coins: 150,
    ownedItems: [...BASE_OWNED_ITEMS],
    purchaseHistory: [],
    matchesPlayed: 0,
    matchesWon: 0,
    matchesLost: 0,
    matchesDrawn: 0,
    winStreak: 0,
    bestWinStreak: 0,
    highestScore: 0,
    fastestShotKmh: 0,
  };
}

export function createDailyChallenges(
  dateKey = getLocalDateKey()
): DailyChallengesState {
  return {
    dateKey,
    challenges: DAILY_CHALLENGE_TEMPLATES.map((tpl) => ({
      ...tpl,
      progress: 0,
      claimed: false,
    })),
  };
}

export function createDefaultSaveData(): EpicSwingSaveData {
  return {
    version: CURRENT_SAVE_VERSION,
    matchConfig: { ...DEFAULT_MATCH_CONFIG },
    preferences: { ...DEFAULT_PREFERENCES },
    statistics: { ...DEFAULT_STATISTICS },
    profiles: {
      p1: createDefaultProfile('p1'),
      p2: createDefaultProfile('p2'),
    },
    dailyChallenges: createDailyChallenges(),
    rewardedMatchIds: [],
  };
}

export function sanitizeProfile(
  raw: Partial<PlayerIdentity> | undefined,
  id: 'p1' | 'p2'
): PlayerIdentity {
  const base = createDefaultProfile(id);
  if (!raw || typeof raw !== 'object') return base;
  const ownedSet = new Set<string>([
    ...BASE_OWNED_ITEMS,
    ...(Array.isArray(raw.ownedItems)
      ? raw.ownedItems.filter((x): x is string => typeof x === 'string')
      : []),
  ]);
  return {
    ...base,
    ...raw,
    id,
    name:
      typeof raw.name === 'string' && raw.name.trim()
        ? raw.name.slice(0, 18)
        : base.name,
    coins:
      typeof raw.coins === 'number' && Number.isFinite(raw.coins)
        ? Math.max(0, Math.floor(raw.coins))
        : base.coins,
    ownedItems: Array.from(ownedSet),
    purchaseHistory: Array.isArray(raw.purchaseHistory)
      ? raw.purchaseHistory.slice(0, 60)
      : [],
    matchesPlayed: Math.max(0, Math.floor(raw.matchesPlayed ?? 0)),
    matchesWon: Math.max(0, Math.floor(raw.matchesWon ?? 0)),
    matchesLost: Math.max(0, Math.floor(raw.matchesLost ?? 0)),
    matchesDrawn: Math.max(0, Math.floor(raw.matchesDrawn ?? 0)),
    winStreak: Math.max(0, Math.floor(raw.winStreak ?? 0)),
    bestWinStreak: Math.max(0, Math.floor(raw.bestWinStreak ?? 0)),
    highestScore: Math.max(0, Math.floor(raw.highestScore ?? 0)),
    fastestShotKmh: Math.max(0, Math.floor(raw.fastestShotKmh ?? 0)),
  };
}

export function migrateLegacyV1Data(
  readItem: (key: string) => string | null
): EpicSwingSaveData {
  const defaults = createDefaultSaveData();
  const safeParse = <T,>(key: string, fallback: T): T => {
    try {
      const raw = readItem(key);
      if (!raw) return fallback;
      return { ...fallback, ...JSON.parse(raw) };
    } catch {
      return fallback;
    }
  };

  const legacyConfig = safeParse(LEGACY_KEYS.MATCH_CONFIG, DEFAULT_MATCH_CONFIG);
  const legacyPrefs = safeParse(LEGACY_KEYS.PREFERENCES, DEFAULT_PREFERENCES);
  const legacyStats = safeParse(LEGACY_KEYS.STATISTICS, DEFAULT_STATISTICS);

  return {
    ...defaults,
    matchConfig: legacyConfig,
    preferences: { ...DEFAULT_PREFERENCES, ...legacyPrefs },
    statistics: legacyStats,
    profiles: {
      p1: {
        ...defaults.profiles.p1,
        name: legacyConfig.player1Name || 'Player 1',
        matchesPlayed: legacyStats.totalMatches,
        matchesWon: legacyStats.p1Wins,
        matchesLost: legacyStats.p2Wins,
        matchesDrawn: legacyStats.draws,
        highestScore: legacyStats.bestSingleMatchScore,
        fastestShotKmh: legacyStats.fastestShotKmh,
      },
      p2: {
        ...defaults.profiles.p2,
        name: legacyConfig.player2Name || 'Player 2',
      },
    },
  };
}

export function validateParsedSaveData(
  parsed: Partial<EpicSwingSaveData>
): EpicSwingSaveData {
  const defaults = createDefaultSaveData();
  const todayKey = getLocalDateKey();
  const savedDaily = parsed.dailyChallenges;

  const dailyChallenges: DailyChallengesState =
    savedDaily &&
    savedDaily.dateKey === todayKey &&
    Array.isArray(savedDaily.challenges)
      ? {
          dateKey: todayKey,
          challenges: DAILY_CHALLENGE_TEMPLATES.map((tpl) => {
            const existing = savedDaily.challenges.find((c) => c.id === tpl.id);
            return existing
              ? {
                  ...tpl,
                  progress: Math.max(
                    0,
                    Math.min(tpl.target, existing.progress || 0)
                  ),
                  claimed: Boolean(existing.claimed),
                }
              : { ...tpl, progress: 0, claimed: false };
          }),
        }
      : createDailyChallenges(todayKey);

  const p1 = sanitizeProfile(parsed.profiles?.p1, 'p1');
  const p2 = sanitizeProfile(parsed.profiles?.p2, 'p2');

  const rawSpeed = parsed.matchConfig?.gameplaySpeed;
  const validSpeed =
    rawSpeed === 'slow' || rawSpeed === 'normal' || rawSpeed === 'fast'
      ? rawSpeed
      : DEFAULT_MATCH_CONFIG.gameplaySpeed;

  const rawWinScore = parsed.matchConfig?.winningScore;
  const validWinScore =
    typeof rawWinScore === 'number' && Number.isFinite(rawWinScore)
      ? Math.max(0, Math.min(25, Math.round(rawWinScore)))
      : DEFAULT_MATCH_CONFIG.winningScore;

  const rawDiff = parsed.matchConfig?.difficulty;
  const validDiff =
    rawDiff === 'easy' ||
    rawDiff === 'medium' ||
    rawDiff === 'hard' ||
    rawDiff === 'expert'
      ? rawDiff
      : DEFAULT_MATCH_CONFIG.difficulty;

  const matchConfig: MatchConfig = {
    ...DEFAULT_MATCH_CONFIG,
    ...(parsed.matchConfig || {}),
    difficulty: validDiff,
    gameplaySpeed: validSpeed,
    winningScore: validWinScore,
    player1Name: p1.name,
    player2Name: p2.name,
  };

  const rawSens = parsed.preferences?.touchSensitivity;
  const clampedSens =
    typeof rawSens === 'number' && Number.isFinite(rawSens)
      ? Math.max(0.75, Math.min(1.35, rawSens))
      : DEFAULT_PREFERENCES.touchSensitivity;

  return {
    version: CURRENT_SAVE_VERSION,
    matchConfig,
    preferences: {
      ...DEFAULT_PREFERENCES,
      ...(parsed.preferences || {}),
      touchSensitivity: clampedSens,
    },
    statistics: {
      ...DEFAULT_STATISTICS,
      ...(parsed.statistics || {}),
      recentMatches: Array.isArray(parsed.statistics?.recentMatches)
        ? parsed.statistics!.recentMatches.slice(0, 25)
        : [],
    },
    profiles: { p1, p2 },
    dailyChallenges,
    rewardedMatchIds: Array.isArray(parsed.rewardedMatchIds)
      ? parsed.rewardedMatchIds
          .filter((x): x is string => typeof x === 'string')
          .slice(-80)
      : [],
  };
}
