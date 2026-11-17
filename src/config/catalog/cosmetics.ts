import type {
  ArenaBgId,
  AvatarId,
  GoalEffectId,
  PuckSkinId,
  StoreCatalogItem,
  TrailEffectId,
} from '@/types/game';

export const AVATAR_ITEMS: StoreCatalogItem<AvatarId>[] = [
  { id: 'striker_ace', category: 'avatars', name: 'Striker Ace', subtitle: 'Classic championship emblem', price: 0, rarity: 'Standard', previewHex: '#00D8F6', accentHex: '#0F172A' },
  { id: 'cyber_visor', category: 'avatars', name: 'Cyber Visor', subtitle: 'Optic visor arcade pilot', price: 0, rarity: 'Standard', previewHex: '#38BDF8', accentHex: '#1E293B' },
  { id: 'flame_fox', category: 'avatars', name: 'Blaze Striker', subtitle: 'High-tempo orange flare', price: 0, rarity: 'Standard', previewHex: '#FF6B1A', accentHex: '#1C1917' },
  { id: 'ice_wolf', category: 'avatars', name: 'Arctic Wolf', subtitle: 'Glacial defender badge', price: 150, rarity: 'Rare', previewHex: '#7DD3FC', accentHex: '#0C4A6E' },
  { id: 'titan_helmet', category: 'avatars', name: 'Titan Vanguard', subtitle: 'Heavy armored crest', price: 200, rarity: 'Rare', previewHex: '#94A3B8', accentHex: '#334155' },
  { id: 'neon_bolt', category: 'avatars', name: 'Volt Surge', subtitle: 'High-voltage lightning mark', price: 250, rarity: 'Rare', previewHex: '#A855F7', accentHex: '#2E1065' },
  { id: 'phantom_mask', category: 'avatars', name: 'Phantom Edge', subtitle: 'Stealth cyber mask', price: 400, rarity: 'Epic', previewHex: '#10B981', accentHex: '#064E3B' },
  { id: 'solar_hawk', category: 'avatars', name: 'Solar Wing', subtitle: 'Crimson predator insignia', price: 500, rarity: 'Epic', previewHex: '#EF4444', accentHex: '#450A0A' },
  { id: 'gold_crown', category: 'avatars', name: 'Royal Crown', subtitle: 'Golden tournament crest', price: 750, rarity: 'Epic', previewHex: '#FACC15', accentHex: '#422006' },
  { id: 'apex_legend', category: 'avatars', name: 'Epic Swing Master', subtitle: 'Dual cyan-orange elite crest', price: 1200, rarity: 'Legendary', previewHex: '#00F5FF', accentHex: '#FF6B1A' },
];

export const TRAIL_EFFECTS: StoreCatalogItem<TrailEffectId>[] = [
  { id: 'silver_stream', category: 'vfx', name: 'Silver Stream', subtitle: 'Crisp tournament air trail', price: 0, rarity: 'Standard', previewHex: '#E0F2FE' },
  { id: 'cyan_plasma', category: 'vfx', name: 'Cyan Plasma Wake', subtitle: 'Electric blue ionized wake', price: 250, rarity: 'Rare', previewHex: '#00E5FF' },
  { id: 'solar_flare', category: 'vfx', name: 'Solar Flare Trail', subtitle: 'Blazing amber-orange streak', price: 350, rarity: 'Rare', previewHex: '#FF6B1A' },
  { id: 'void_lightning', category: 'vfx', name: 'Violet Arc Wake', subtitle: 'High-voltage purple plasma', price: 500, rarity: 'Epic', previewHex: '#C084FC' },
  { id: 'prismatic_pulse', category: 'vfx', name: 'Championship Gold Wake', subtitle: 'Luminous golden afterburner', price: 850, rarity: 'Legendary', previewHex: '#FACC15' },
];

export const GOAL_EFFECTS: StoreCatalogItem<GoalEffectId>[] = [
  { id: 'arcade_flash', category: 'goal_fx', name: 'Arcade Flash', subtitle: 'Classic goal bar surge & sparks', price: 0, rarity: 'Standard', previewHex: '#38BDF8' },
  { id: 'shockwave_nova', category: 'goal_fx', name: 'Cyan Shockwave Nova', subtitle: 'Expanded electric shock ring', price: 300, rarity: 'Rare', previewHex: '#00E5FF' },
  { id: 'inferno_burst', category: 'goal_fx', name: 'Inferno Burst', subtitle: 'Volcanic orange ember detonation', price: 450, rarity: 'Epic', previewHex: '#FF5722' },
  { id: 'frost_shatter', category: 'goal_fx', name: 'Frost Shatter', subtitle: 'Arctic sapphire crystal burst', price: 500, rarity: 'Epic', previewHex: '#BAE6FD' },
  { id: 'gold_supernova', category: 'goal_fx', name: 'Gold Supernova', subtitle: 'Triple golden victory shockwaves', price: 900, rarity: 'Legendary', previewHex: '#FACC15' },
];

export const PUCK_SKINS: StoreCatalogItem<PuckSkinId>[] = [
  { id: 'tournament_pro', category: 'pucks', name: 'Tournament Pro', subtitle: 'Pearl white top, obsidian collar, gold spinner', price: 0, rarity: 'Standard', previewHex: '#F8FAFC', accentHex: '#FACC15' },
  { id: 'neon_core', category: 'pucks', name: 'Neon Reactor', subtitle: 'Cyan luminous core with dark carbon rim', price: 220, rarity: 'Rare', previewHex: '#00E5FF', accentHex: '#0F172A' },
  { id: 'magma_disc', category: 'pucks', name: 'Magma Disc', subtitle: 'Molten orange inner ring with gunmetal edge', price: 320, rarity: 'Rare', previewHex: '#FF6B1A', accentHex: '#1E1B18' },
  { id: 'glacier_core', category: 'pucks', name: 'Glacier Disc', subtitle: 'Icy frost top with sapphire center ring', price: 420, rarity: 'Epic', previewHex: '#E0F2FE', accentHex: '#0284C7' },
  { id: 'bullion_gold', category: 'pucks', name: '24K Bullion Puck', subtitle: 'Metallic gold finish with obsidian trim', price: 800, rarity: 'Legendary', previewHex: '#FACC15', accentHex: '#090D16' },
];

export const ARENA_BACKGROUNDS: StoreCatalogItem<ArenaBgId>[] = [
  { id: 'midnight_arcade', category: 'backgrounds', name: 'Midnight Arcade Hall', subtitle: 'Deep charcoal studio with cobalt spotlight', price: 0, rarity: 'Standard', previewHex: '#05070C', accentHex: '#0E2A55' },
  { id: 'cyber_grid', category: 'backgrounds', name: 'Cyber Telemetry Grid', subtitle: 'Dark cyan wireframe horizon ring', price: 300, rarity: 'Rare', previewHex: '#041218', accentHex: '#06B6D4' },
  { id: 'volcanic_vault', category: 'backgrounds', name: 'Ember Vault', subtitle: 'Smoked obsidian floor with warm amber halo', price: 400, rarity: 'Rare', previewHex: '#120706', accentHex: '#EA580C' },
  { id: 'arctic_hall', category: 'backgrounds', name: 'Arctic Pavilion', subtitle: 'Crisp polar navy backdrop with frost glow', price: 500, rarity: 'Epic', previewHex: '#061322', accentHex: '#38BDF8' },
  { id: 'championship_gold', category: 'backgrounds', name: 'Grand Finals Stage', subtitle: 'VIP black-tie gold spotlight arena', price: 900, rarity: 'Legendary', previewHex: '#0D0B06', accentHex: '#EAB308' },
];
