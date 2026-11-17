import type { StoreCatalogItem, StoreCategory } from '@/types/game';
import {
  ARENA_BACKGROUNDS,
  AVATAR_ITEMS,
  GOAL_EFFECTS,
  PUCK_SKINS,
  TRAIL_EFFECTS,
} from './cosmetics';
import { STRIKER_COLORS, STRIKER_STYLES } from './strikers';
import { TABLE_THEMES } from './themes';

export * from './rewards';
export * from './strikers';
export * from './themes';
export * from './cosmetics';

export function getStoreCatalogByCategory(
  category: StoreCategory
): StoreCatalogItem[] {
  switch (category) {
    case 'strikers':
      return STRIKER_STYLES;
    case 'colors':
      return STRIKER_COLORS.map((c) => ({
        id: c.id,
        category: 'colors',
        name: c.name,
        subtitle:
          c.id === 'custom'
            ? 'Unlock custom hex picker for infinite striker colors'
            : 'Permanent striker color finish for any striker style',
        price: c.price,
        rarity: c.price >= 300 ? 'Epic' : c.price > 0 ? 'Rare' : 'Standard',
        previewHex: c.hex,
        accentHex: c.brightHex,
      }));
    case 'themes':
      return TABLE_THEMES.map((t) => ({
        id: t.id,
        category: 'themes',
        name: t.name,
        subtitle: t.subtitle,
        price: t.price,
        rarity: t.rarity,
        previewHex: t.surfaceTop,
        accentHex: t.lineAccentP1,
      }));
    case 'avatars':
      return AVATAR_ITEMS;
    case 'vfx':
      return TRAIL_EFFECTS;
    case 'goal_fx':
      return GOAL_EFFECTS;
    case 'pucks':
      return PUCK_SKINS;
    case 'backgrounds':
      return ARENA_BACKGROUNDS;
  }
}
