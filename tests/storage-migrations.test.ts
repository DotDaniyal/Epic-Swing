import assert from 'node:assert/strict';
import {
  ensureDailyChallengesCurrent,
  loadSaveData,
  resetAllProgressData,
  resetAllStatisticsOnly,
  saveAllData,
} from '@/storage/localStorage';
import {
  BASE_OWNED_ITEMS,
  CURRENT_SAVE_VERSION,
  LEGACY_KEYS,
  SAVE_KEY,
  createDefaultSaveData,
  migrateLegacyV1Data,
  sanitizeProfile,
  validateParsedSaveData,
} from '@/storage/migrations';

function installMockLocalStorage(): () => void {
  const store = new Map<string, string>();
  const prevWindow = (globalThis as Record<string, unknown>).window;
  (globalThis as Record<string, unknown>).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => {
        store.clear();
      },
    },
  };
  return () => {
    if (prevWindow === undefined) {
      delete (globalThis as Record<string, unknown>).window;
    } else {
      (globalThis as Record<string, unknown>).window = prevWindow;
    }
  };
}

export function runStorageAndMigrationTests(): number {
  let passed = 0;

  // 1. Profile sanitization guarantees base owned items & clamps invalid values
  {
    const clean = sanitizeProfile(
      {
        name: '   ',
        coins: -250,
        ownedItems: ['strikers:holographic'],
        matchesWon: -3,
      },
      'p1'
    );
    assert.equal(clean.name, 'Player 1', 'Blank name falls back to Player 1');
    assert.equal(clean.coins, 0, 'Negative coins clamp to 0');
    assert.equal(clean.matchesWon, 0, 'Negative win count clamps to 0');
    for (const baseKey of BASE_OWNED_ITEMS) {
      assert.ok(
        clean.ownedItems.includes(baseKey),
        `Base item ${baseKey} preserved`
      );
    }
    assert.ok(clean.ownedItems.includes('strikers:holographic'));
    passed++;
  }

  // 2. Legacy v1 -> v2 migration preserves player names, stats, and preferences
  {
    const legacyStore: Record<string, string> = {
      [LEGACY_KEYS.MATCH_CONFIG]: JSON.stringify({
        mode: 'two_player',
        player1Name: 'Nova',
        player2Name: 'Vortex',
      }),
      [LEGACY_KEYS.STATISTICS]: JSON.stringify({
        totalMatches: 12,
        p1Wins: 7,
        p2Wins: 4,
        draws: 1,
        bestSingleMatchScore: 9,
        fastestShotKmh: 112,
      }),
      [LEGACY_KEYS.PREFERENCES]: JSON.stringify({
        sfxVolume: 0.45,
        cameraView: 'top_down',
      }),
    };

    const migrated = migrateLegacyV1Data((k) => legacyStore[k] ?? null);
    assert.equal(migrated.version, CURRENT_SAVE_VERSION);
    assert.equal(migrated.profiles.p1.name, 'Nova');
    assert.equal(migrated.profiles.p2.name, 'Vortex');
    assert.equal(migrated.statistics.totalMatches, 12);
    assert.equal(migrated.profiles.p1.matchesWon, 7);
    assert.equal(migrated.profiles.p1.fastestShotKmh, 112);
    assert.equal(migrated.preferences.cameraView, 'top_down');
    passed++;
  }

  // 3. Stale daily challenge date refreshes while keeping coins/profiles
  {
    const restore = installMockLocalStorage();
    try {
      const save = createDefaultSaveData();
      save.profiles.p1.coins = 420;
      save.dailyChallenges.dateKey = '2000-01-01';
      save.dailyChallenges.challenges[0].progress = 1;
      save.dailyChallenges.challenges[0].claimed = true;

      const refreshed = ensureDailyChallengesCurrent(save);
      assert.notEqual(refreshed.dailyChallenges.dateKey, '2000-01-01');
      assert.equal(refreshed.dailyChallenges.challenges[0].progress, 0);
      assert.equal(refreshed.dailyChallenges.challenges[0].claimed, false);
      assert.equal(refreshed.profiles.p1.coins, 420);
    } finally {
      restore();
    }
    passed++;
  }

  // 4. LocalStorage save/load round-trip & statistics/progress resets
  {
    const restore = installMockLocalStorage();
    try {
      const initial = createDefaultSaveData();
      initial.profiles.p1.name = 'Blaze';
      initial.profiles.p1.coins = 777;
      initial.statistics.totalMatches = 5;
      saveAllData(initial);

      const loaded = loadSaveData();
      assert.equal(loaded.profiles.p1.name, 'Blaze');
      assert.equal(loaded.profiles.p1.coins, 777);
      assert.equal(loaded.statistics.totalMatches, 5);

      const statsCleared = resetAllStatisticsOnly(loaded);
      assert.equal(statsCleared.statistics.totalMatches, 0);
      assert.equal(statsCleared.profiles.p1.coins, 777, 'Stats reset keeps coins');

      const wiped = resetAllProgressData();
      assert.equal(wiped.profiles.p1.name, 'Player 1');
      assert.equal(wiped.profiles.p1.coins, 150);
      assert.ok(
        Boolean((globalThis as Record<string, unknown>).window),
        'Mock storage active during test'
      );

      // Corrupt JSON fallback
      (
        (globalThis as Record<string, unknown>).window as {
          localStorage: { setItem: (k: string, v: string) => void };
        }
      ).localStorage.setItem(SAVE_KEY, '{corrupt json');
      const fallback = loadSaveData();
      assert.equal(fallback.version, CURRENT_SAVE_VERSION);
    } finally {
      restore();
    }
    passed++;
  }

  // 5. validateParsedSaveData syncs matchConfig names & trims recentMatches to 25
  {
    const validated = validateParsedSaveData({
      profiles: {
        p1: sanitizeProfile({ name: 'CyberP1' }, 'p1'),
        p2: sanitizeProfile({ name: 'NeonP2' }, 'p2'),
      },
      statistics: {
        totalMatches: 30,
        p1Wins: 15,
        p2Wins: 10,
        draws: 5,
        aiWins: 0,
        aiLosses: 0,
        totalGoalsScored: 90,
        bestSingleMatchScore: 7,
        fastestShotKmh: 95,
        recentMatches: Array.from({ length: 30 }, (_, i) => ({
          id: `r-${i}`,
          timestamp: i,
          mode: 'vs_ai' as const,
          player1Name: 'CyberP1',
          player2Name: 'AI',
          score1: 3,
          score2: 1,
          durationSeconds: 180,
          winner: 'p1' as const,
          topSpeedKmh: 80,
        })),
      },
    });
    assert.equal(validated.matchConfig.player1Name, 'CyberP1');
    assert.equal(validated.matchConfig.player2Name, 'NeonP2');
    assert.equal(validated.statistics.recentMatches.length, 25);
    passed++;
  }

  return passed;
}
