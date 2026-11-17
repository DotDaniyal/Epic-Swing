import { itemKey } from '@/config/catalog';
import { saveAllData } from '@/storage/localStorage';
import type {
  EpicSwingSaveData,
  PlayerIdentity,
  PurchaseRecord,
  StoreCategory,
} from '@/types/game';

export function purchaseStoreItemForProfile(
  save: EpicSwingSaveData,
  playerId: 'p1' | 'p2',
  category: StoreCategory,
  itemId: string,
  itemName: string,
  price: number
): {
  ok: boolean;
  reason?: 'already_owned' | 'insufficient_coins';
  nextSave: EpicSwingSaveData;
} {
  const profile = save.profiles[playerId];
  const key = itemKey(category, itemId);

  if (profile.ownedItems.includes(key)) {
    return { ok: false, reason: 'already_owned', nextSave: save };
  }
  const safePrice = Math.max(0, Math.floor(price));
  if (profile.coins < safePrice) {
    return { ok: false, reason: 'insufficient_coins', nextSave: save };
  }

  const purchase: PurchaseRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemKey: key,
    itemName,
    category,
    price: safePrice,
    timestamp: Date.now(),
  };

  const nextProfile: PlayerIdentity = {
    ...profile,
    coins: Math.max(0, profile.coins - safePrice),
    ownedItems: [...profile.ownedItems, key],
    purchaseHistory: [purchase, ...profile.purchaseHistory].slice(0, 60),
  };

  const nextSave: EpicSwingSaveData = {
    ...save,
    profiles: {
      ...save.profiles,
      [playerId]: nextProfile,
    },
  };
  saveAllData(nextSave);
  return { ok: true, nextSave };
}

export function equipItemOnProfile(
  profile: PlayerIdentity,
  category: StoreCategory,
  itemId: string
): PlayerIdentity {
  const next = { ...profile };
  switch (category) {
    case 'strikers':
      next.strikerId = itemId as PlayerIdentity['strikerId'];
      break;
    case 'colors':
      next.strikerColorId = itemId as PlayerIdentity['strikerColorId'];
      break;
    case 'themes':
      next.tableThemeId = itemId as PlayerIdentity['tableThemeId'];
      break;
    case 'avatars':
      next.avatarId = itemId as PlayerIdentity['avatarId'];
      break;
    case 'vfx':
      next.trailEffectId = itemId as PlayerIdentity['trailEffectId'];
      break;
    case 'goal_fx':
      next.goalEffectId = itemId as PlayerIdentity['goalEffectId'];
      break;
    case 'pucks':
      next.puckSkinId = itemId as PlayerIdentity['puckSkinId'];
      break;
    case 'backgrounds':
      next.arenaBgId = itemId as PlayerIdentity['arenaBgId'];
      break;
  }
  return next;
}
