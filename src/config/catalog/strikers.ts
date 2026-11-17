import type {
  StoreCatalogItem,
  StrikerColorId,
  StrikerStyleId,
} from '@/types/game';

export interface StrikerColorConfig {
  id: StrikerColorId;
  name: string;
  hex: string;
  brightHex: string;
  price: number;
}

export const STRIKER_STYLES: StoreCatalogItem<StrikerStyleId>[] = [
  {
    id: 'classic',
    category: 'strikers',
    name: 'Classic Metallic',
    subtitle: 'Brushed chrome bumper with balanced dome grip',
    price: 0,
    rarity: 'Standard',
    previewHex: '#00D8F6',
    accentHex: '#CBD5E1',
  },
  {
    id: 'neon_cyan',
    category: 'strikers',
    name: 'Neon Cyan Pulse',
    subtitle: 'Obsidian rim with luminous edge ring & clearcoat deck',
    price: 0,
    rarity: 'Standard',
    previewHex: '#00E5FF',
    accentHex: '#0B101B',
  },
  {
    id: 'fiery_orange',
    category: 'strikers',
    name: 'Fiery Orange Ember',
    subtitle: 'Vented magma collar with high-contrast orange core',
    price: 0,
    rarity: 'Standard',
    previewHex: '#FF6B1A',
    accentHex: '#1E1B18',
  },
  {
    id: 'red_metallic',
    category: 'strikers',
    name: 'Red Metallic Apex',
    subtitle: 'Anodized racing crimson shell with machined bevels',
    price: 150,
    rarity: 'Rare',
    previewHex: '#EF4444',
    accentHex: '#E2E8F0',
  },
  {
    id: 'purple_electric',
    category: 'strikers',
    name: 'Purple Electric Surge',
    subtitle: 'High-voltage violet plasma torus and faceted crown',
    price: 250,
    rarity: 'Rare',
    previewHex: '#A855F7',
    accentHex: '#38BDF8',
  },
  {
    id: 'carbon_fiber',
    category: 'strikers',
    name: 'Carbon Fiber Pro',
    subtitle: 'Woven carbon composite deck with satin titanium collar',
    price: 500,
    rarity: 'Epic',
    previewHex: '#334155',
    accentHex: '#38BDF8',
  },
  {
    id: 'ice_crystal',
    category: 'strikers',
    name: 'Ice Crystal Prism',
    subtitle: 'Faceted arctic prism bevels with frosted clearcoat',
    price: 600,
    rarity: 'Epic',
    previewHex: '#7DD3FC',
    accentHex: '#FFFFFF',
  },
  {
    id: 'golden_premium',
    category: 'strikers',
    name: 'Golden Championship',
    subtitle: '24K brushed metallic gold with obsidian inlay ring',
    price: 750,
    rarity: 'Epic',
    previewHex: '#FACC15',
    accentHex: '#0B101B',
  },
  {
    id: 'holographic',
    category: 'strikers',
    name: 'Holographic Prism',
    subtitle: 'Iridescent specular clearcoat with tri-band rim',
    price: 950,
    rarity: 'Epic',
    previewHex: '#38BDF8',
    accentHex: '#F472B6',
  },
  {
    id: 'legendary_animated',
    category: 'strikers',
    name: 'Hyperion Core (Animated)',
    subtitle: 'Dual counter-rotating turbine halos & pulsing core',
    price: 1500,
    rarity: 'Legendary',
    previewHex: '#00F5FF',
    accentHex: '#FF7A1A',
  },
];

export const STRIKER_COLORS: StrikerColorConfig[] = [
  { id: 'cyan', name: 'Electric Cyan', hex: '#00D8F6', brightHex: '#67F5FF', price: 0 },
  { id: 'orange', name: 'Arcade Orange', hex: '#FF6B1A', brightHex: '#FFA15C', price: 0 },
  { id: 'red', name: 'Crimson Red', hex: '#FF3B2F', brightHex: '#FF756B', price: 0 },
  { id: 'blue', name: 'Cobalt Blue', hex: '#2563EB', brightHex: '#60A5FA', price: 100 },
  { id: 'purple', name: 'Neon Purple', hex: '#9333EA', brightHex: '#C084FC', price: 150 },
  { id: 'green', name: 'Volt Green', hex: '#10B981', brightHex: '#34D399', price: 150 },
  { id: 'gold', name: 'Championship Gold', hex: '#F59E0B', brightHex: '#FDE047', price: 250 },
  { id: 'silver', name: 'Chrome Silver', hex: '#CBD5E1', brightHex: '#F8FAFC', price: 200 },
  { id: 'black_metallic', name: 'Obsidian Stealth', hex: '#1E293B', brightHex: '#64748B', price: 300 },
  { id: 'custom', name: 'Custom Color Studio', hex: '#00E5FF', brightHex: '#FFFFFF', price: 400 },
];

export function resolveStrikerHex(
  colorId: StrikerColorId,
  customHex: string
): { hex: string; brightHex: string } {
  if (colorId === 'custom') {
    const valid = /^#[0-9A-Fa-f]{6}$/.test(customHex) ? customHex : '#00E5FF';
    return { hex: valid, brightHex: valid };
  }
  const found = STRIKER_COLORS.find((c) => c.id === colorId) ?? STRIKER_COLORS[0];
  return { hex: found.hex, brightHex: found.brightHex };
}
