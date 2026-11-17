import type { EpicSwingSaveData } from '@/types/game';
import {
  DEFAULT_STATISTICS,
  SAVE_KEY,
  createDailyChallenges,
  createDefaultSaveData,
  getLocalDateKey,
  migrateLegacyV1Data,
  validateParsedSaveData,
} from './migrations';

export function saveAllData(data: EpicSwingSaveData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota or private browsing errors gracefully
  }
}

export function loadSaveData(): EpicSwingSaveData {
  const defaults = createDefaultSaveData();
  if (typeof window === 'undefined') return defaults;

  try {
    const rawStr = window.localStorage.getItem(SAVE_KEY);
    if (!rawStr) {
      const migrated = migrateLegacyV1Data((k) =>
        window.localStorage.getItem(k)
      );
      saveAllData(migrated);
      return migrated;
    }

    const parsed = JSON.parse(rawStr) as Partial<EpicSwingSaveData>;
    return validateParsedSaveData(parsed);
  } catch {
    return defaults;
  }
}

export function ensureDailyChallengesCurrent(
  save: EpicSwingSaveData
): EpicSwingSaveData {
  const today = getLocalDateKey();
  if (save.dailyChallenges.dateKey === today) return save;
  const next: EpicSwingSaveData = {
    ...save,
    dailyChallenges: createDailyChallenges(today),
  };
  saveAllData(next);
  return next;
}

export function resetAllProgressData(): EpicSwingSaveData {
  const fresh = createDefaultSaveData();
  saveAllData(fresh);
  return fresh;
}

export function resetAllStatisticsOnly(
  save: EpicSwingSaveData
): EpicSwingSaveData {
  const next: EpicSwingSaveData = {
    ...save,
    statistics: { ...DEFAULT_STATISTICS },
  };
  saveAllData(next);
  return next;
}
