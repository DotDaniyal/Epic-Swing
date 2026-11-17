export type GameMode = 'two_player' | 'vs_ai' | 'practice';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export type QualityPreset = 'auto' | 'high' | 'balanced' | 'low';

export type CameraViewMode = 'broadcast' | 'top_down';

export type IntroPreference = 'auto' | 'skip';

export type ScreenId =
  | 'loading'
  | 'intro'
  | 'menu'
  | 'setup_mode'
  | 'setup_players'
  | 'setup_duration'
  | 'setup_difficulty'
  | 'customize'
  | 'store'
  | 'profile'
  | 'instructions'
  | 'playing'
  | 'paused'
  | 'results'
  | 'statistics'
  | 'settings';

export type MatchPhase =
  | 'idle'
  | 'cinematic'
  | 'countdown'
  | 'active'
  | 'goal_pause'
  | 'paused'
  | 'finished';

export type StrikerStyleId =
  | 'classic'
  | 'neon_cyan'
  | 'fiery_orange'
  | 'red_metallic'
  | 'purple_electric'
  | 'golden_premium'
  | 'ice_crystal'
  | 'carbon_fiber'
  | 'holographic'
  | 'legendary_animated';

export type StrikerColorId =
  | 'cyan'
  | 'orange'
  | 'red'
  | 'blue'
  | 'purple'
  | 'green'
  | 'gold'
  | 'silver'
  | 'black_metallic'
  | 'custom';

export type TableThemeId =
  | 'classic_arcade'
  | 'neon_arena'
  | 'fire_arena'
  | 'ice_arena'
  | 'golden_arena'
  | 'cyber_arena';

export type AvatarId =
  | 'striker_ace'
  | 'cyber_visor'
  | 'flame_fox'
  | 'ice_wolf'
  | 'titan_helmet'
  | 'neon_bolt'
  | 'gold_crown'
  | 'phantom_mask'
  | 'solar_hawk'
  | 'apex_legend';

export type TrailEffectId =
  | 'silver_stream'
  | 'cyan_plasma'
  | 'solar_flare'
  | 'void_lightning'
  | 'prismatic_pulse';

export type GoalEffectId =
  | 'arcade_flash'
  | 'shockwave_nova'
  | 'inferno_burst'
  | 'frost_shatter'
  | 'gold_supernova';

export type PuckSkinId =
  | 'tournament_pro'
  | 'neon_core'
  | 'magma_disc'
  | 'glacier_core'
  | 'bullion_gold';

export type ArenaBgId =
  | 'midnight_arcade'
  | 'cyber_grid'
  | 'volcanic_vault'
  | 'arctic_hall'
  | 'championship_gold';

export type StoreCategory =
  | 'strikers'
  | 'colors'
  | 'themes'
  | 'avatars'
  | 'vfx'
  | 'goal_fx'
  | 'pucks'
  | 'backgrounds';

export interface PlayerIdentity {
  id: 'p1' | 'p2';
  name: string;
  avatarId: AvatarId;
  avatarColor: string;
  strikerId: StrikerStyleId;
  strikerColorId: StrikerColorId;
  customColorHex: string;
  tableThemeId: TableThemeId;
  trailEffectId: TrailEffectId;
  goalEffectId: GoalEffectId;
  puckSkinId: PuckSkinId;
  arenaBgId: ArenaBgId;
  coins: number;
  ownedItems: string[]; // composite keys e.g. 'strikers:classic', 'themes:neon_arena'
  purchaseHistory: PurchaseRecord[];
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  matchesDrawn: number;
  winStreak: number;
  bestWinStreak: number;
  highestScore: number;
  fastestShotKmh: number;
}

export interface PurchaseRecord {
  id: string;
  itemKey: string;
  itemName: string;
  category: StoreCategory;
  price: number;
  timestamp: number;
}

export interface DailyChallengeItem {
  id: 'win_1' | 'score_5' | 'win_2' | 'play_3';
  title: string;
  description: string;
  target: number;
  progress: number;
  rewardCoins: number;
  claimed: boolean;
}

export interface DailyChallengesState {
  dateKey: string; // Local YYYY-MM-DD
  challenges: DailyChallengeItem[];
}

export interface MatchConfig {
  mode: GameMode;
  difficulty: AIDifficulty;
  durationSeconds: number;
  customDurationMinutes: number;
  player1Name: string;
  player2Name: string;
  practiceSpeedMultiplier: number;
}

export interface UserPreferences {
  sfxEnabled: boolean;
  sfxVolume: number; // 0 to 1
  musicEnabled: boolean;
  musicVolume: number; // 0 to 1
  muteAll: boolean;
  quality: QualityPreset;
  cameraView: CameraViewMode;
  reducedMotion: boolean;
  mirrorTopScoreOnMobile: boolean;
  introPreference: IntroPreference;
  hasSeenIntro: boolean;
}

export interface MatchRecord {
  id: string;
  timestamp: number;
  mode: GameMode;
  difficulty?: AIDifficulty;
  player1Name: string;
  player2Name: string;
  score1: number;
  score2: number;
  durationSeconds: number;
  winner: 'p1' | 'p2' | 'draw';
  topSpeedKmh: number;
  p1CoinsEarned?: number;
  p2CoinsEarned?: number;
}

export interface PlayerStatistics {
  totalMatches: number;
  p1Wins: number;
  p2Wins: number;
  draws: number;
  aiWins: number;
  aiLosses: number;
  totalGoalsScored: number;
  bestSingleMatchScore: number;
  fastestShotKmh: number;
  recentMatches: MatchRecord[];
}

export interface MatchRewardBreakdown {
  matchId: string;
  p1BaseCoins: number;
  p1CleanSheetBonus: number;
  p1StreakBonus: number;
  p1TotalCoins: number;
  p2TotalCoins: number;
  newlyCompletedChallengeIds: string[];
  challengeCoinsAwarded: number;
  alreadyRewarded: boolean;
}

export interface LiveMatchHUDState {
  matchId: string;
  phase: MatchPhase;
  score1: number;
  score2: number;
  remainingSeconds: number;
  countdownValue: number; // 3, 2, 1, 0 (GO)
  lastGoalScorer: 'p1' | 'p2' | null;
  lastGoalSpeedKmh: number;
  topSpeedKmh: number;
  totalHits: number;
  puckSpeedKmh: number;
  winner: 'p1' | 'p2' | 'draw' | null;
}

export interface StoreCatalogItem<TId extends string = string> {
  id: TId;
  category: StoreCategory;
  name: string;
  subtitle: string;
  price: number;
  rarity: 'Standard' | 'Rare' | 'Epic' | 'Legendary';
  previewHex: string;
  accentHex?: string;
}

export interface EpicSwingSaveData {
  version: number;
  matchConfig: MatchConfig;
  preferences: UserPreferences;
  statistics: PlayerStatistics;
  profiles: {
    p1: PlayerIdentity;
    p2: PlayerIdentity;
  };
  dailyChallenges: DailyChallengesState;
  rewardedMatchIds: string[];
}
