import assert from 'node:assert/strict';
import { ECONOMY_REWARDS, itemKey } from '@/config/catalog';
import { processCompletedMatchRewards } from '@/features/coin-system/economy';
import {
  equipItemOnProfile,
  purchaseStoreItemForProfile,
} from '@/features/game-store/transactions';
import { createDefaultSaveData } from '@/storage/migrations';
import type { MatchRecord } from '@/types/game';

function makeMatch(overrides: Partial<MatchRecord> = {}): MatchRecord {
  return {
    id: `match-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    mode: 'vs_ai',
    difficulty: 'medium',
    player1Name: 'Player 1',
    player2Name: 'AI Rival',
    score1: 5,
    score2: 2,
    durationSeconds: 180,
    winner: 'p1',
    topSpeedKmh: 88,
    ...overrides,
  };
}

export function runEconomyAndStoreTests(): number {
  let passed = 0;

  // 1. Match rewards: Win, Clean Sheet, 3-Win Streak, Draw, Loss + Duplicate Match Idempotency
  {
    let save = createDefaultSaveData();
    const startingCoins = save.profiles.p1.coins;

    // Match 1: Win with clean sheet (score2 === 0)
    const m1 = makeMatch({ id: 'm1', score1: 3, score2: 0, winner: 'p1' });
    const r1 = processCompletedMatchRewards(save, m1);
    save = r1.nextSave;

    assert.equal(r1.reward.alreadyRewarded, false);
    assert.equal(r1.reward.p1BaseCoins, ECONOMY_REWARDS.WIN_MATCH);
    assert.equal(r1.reward.p1CleanSheetBonus, ECONOMY_REWARDS.CLEAN_SHEET_BONUS);
    assert.equal(r1.reward.p1StreakBonus, 0);
    // Win 1 match challenge auto-claimed!
    assert.ok(r1.reward.newlyCompletedChallengeIds.includes('win_1'));
    assert.equal(
      save.profiles.p1.coins,
      startingCoins + r1.reward.p1TotalCoins
    );

    // Duplicate claim guard on same matchId
    const dup = processCompletedMatchRewards(save, m1);
    assert.equal(dup.reward.alreadyRewarded, true);
    assert.equal(dup.reward.p1TotalCoins, 0);
    assert.equal(dup.nextSave.profiles.p1.coins, save.profiles.p1.coins);

    // Match 2 & 3: 3-win streak bonus triggers on 3rd win
    const r2 = processCompletedMatchRewards(
      save,
      makeMatch({ id: 'm2', score1: 4, score2: 1, winner: 'p1' })
    );
    save = r2.nextSave;
    const r3 = processCompletedMatchRewards(
      save,
      makeMatch({ id: 'm3', score1: 2, score2: 1, winner: 'p1' })
    );
    save = r3.nextSave;
    assert.equal(save.profiles.p1.winStreak, 3);
    assert.equal(r3.reward.p1StreakBonus, ECONOMY_REWARDS.THREE_WIN_STREAK_BONUS);

    // Match 4: Draw resets streak & pays draw reward
    const r4 = processCompletedMatchRewards(
      save,
      makeMatch({ id: 'm4', score1: 2, score2: 2, winner: 'draw' })
    );
    save = r4.nextSave;
    assert.equal(save.profiles.p1.winStreak, 0);
    assert.equal(r4.reward.p1BaseCoins, ECONOMY_REWARDS.DRAW_MATCH);

    // Match 5: Loss pays loss reward
    const r5 = processCompletedMatchRewards(
      save,
      makeMatch({ id: 'm5', score1: 1, score2: 4, winner: 'p2' })
    );
    assert.equal(r5.reward.p1BaseCoins, ECONOMY_REWARDS.LOSS_MATCH);
    passed++;
  }

  // 2. Two-player mode credits both P1 and P2 separately
  {
    const save = createDefaultSaveData();
    const m2p = makeMatch({
      id: 'm2p-1',
      mode: 'two_player',
      player2Name: 'Player 2',
      score1: 1,
      score2: 4,
      winner: 'p2',
    });
    const res = processCompletedMatchRewards(save, m2p);
    assert.equal(res.reward.p1BaseCoins, ECONOMY_REWARDS.LOSS_MATCH);
    assert.equal(res.reward.p2TotalCoins, ECONOMY_REWARDS.WIN_MATCH);
    assert.equal(res.nextSave.profiles.p2.matchesWon, 1);
    assert.equal(res.nextSave.profiles.p1.matchesLost, 1);
    passed++;
  }

  // 3. Store purchase validation, deduction, duplicate guard, and P1/P2 isolation
  {
    let save = createDefaultSaveData();
    save.profiles.p1.coins = 500;
    save.profiles.p2.coins = 50;

    // P1 buys golden_premium striker for 300 coins
    const buyOk = purchaseStoreItemForProfile(
      save,
      'p1',
      'strikers',
      'golden_premium',
      'Golden Premium',
      300
    );
    assert.equal(buyOk.ok, true);
    save = buyOk.nextSave;
    assert.equal(save.profiles.p1.coins, 200);
    assert.ok(
      save.profiles.p1.ownedItems.includes(
        itemKey('strikers', 'golden_premium')
      )
    );
    assert.ok(
      !save.profiles.p2.ownedItems.includes(
        itemKey('strikers', 'golden_premium')
      ),
      'P1 purchase does not unlock item for P2'
    );

    // Duplicate purchase rejected
    const buyDup = purchaseStoreItemForProfile(
      save,
      'p1',
      'strikers',
      'golden_premium',
      'Golden Premium',
      300
    );
    assert.equal(buyDup.ok, false);
    assert.equal(buyDup.reason, 'already_owned');
    assert.equal(buyDup.nextSave.profiles.p1.coins, 200);

    // Insufficient coins rejected for P2
    const buyPoor = purchaseStoreItemForProfile(
      save,
      'p2',
      'strikers',
      'golden_premium',
      'Golden Premium',
      300
    );
    assert.equal(buyPoor.ok, false);
    assert.equal(buyPoor.reason, 'insufficient_coins');
    assert.equal(buyPoor.nextSave.profiles.p2.coins, 50);
    passed++;
  }

  // 4. Equip item across all store categories
  {
    const save = createDefaultSaveData();
    let profile = save.profiles.p1;
    profile = equipItemOnProfile(profile, 'strikers', 'holographic');
    profile = equipItemOnProfile(profile, 'colors', 'purple');
    profile = equipItemOnProfile(profile, 'themes', 'cyber_arena');
    profile = equipItemOnProfile(profile, 'avatars', 'apex_legend');
    profile = equipItemOnProfile(profile, 'vfx', 'void_lightning');
    profile = equipItemOnProfile(profile, 'goal_fx', 'gold_supernova');
    profile = equipItemOnProfile(profile, 'pucks', 'bullion_gold');
    profile = equipItemOnProfile(profile, 'backgrounds', 'championship_gold');

    assert.equal(profile.strikerId, 'holographic');
    assert.equal(profile.strikerColorId, 'purple');
    assert.equal(profile.tableThemeId, 'cyber_arena');
    assert.equal(profile.avatarId, 'apex_legend');
    assert.equal(profile.trailEffectId, 'void_lightning');
    assert.equal(profile.goalEffectId, 'gold_supernova');
    assert.equal(profile.puckSkinId, 'bullion_gold');
    assert.equal(profile.arenaBgId, 'championship_gold');
    passed++;
  }

  return passed;
}
