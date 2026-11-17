import type { TableThemeId } from '@/types/game';

export interface TableThemeConfig {
  id: TableThemeId;
  name: string;
  subtitle: string;
  price: number;
  rarity: 'Standard' | 'Rare' | 'Epic' | 'Legendary';
  surfaceTop: string;
  surfaceMid: string;
  surfaceEdge: string;
  linePrimary: string;
  lineAccentP1: string;
  lineAccentP2: string;
  railHex: string;
  trimHex: string;
  bgHex: string;
  floorHex: string;
  floorRingHex: string;
  rimLightHex: string;
  softboxHex: string;
  gridOverlay?: boolean;
}

export const TABLE_THEMES: TableThemeConfig[] = [
  {
    id: 'classic_arcade',
    name: 'Classic Arcade',
    subtitle: 'Deep navy metallic bed with crisp white, cyan & orange lines',
    price: 0,
    rarity: 'Standard',
    surfaceTop: '#122952',
    surfaceMid: '#0C1E3D',
    surfaceEdge: '#08142A',
    linePrimary: '#F8FAFC',
    lineAccentP1: '#00D8F6',
    lineAccentP2: '#FF4D3D',
    railHex: '#162238',
    trimHex: '#DBE4F0',
    bgHex: '#05070C',
    floorHex: '#070A12',
    floorRingHex: '#0E2A55',
    rimLightHex: '#38BDF8',
    softboxHex: '#DBEAFE',
  },
  {
    id: 'neon_arena',
    name: 'Neon Arena',
    subtitle: 'Midnight indigo court with electric cyan & ultraviolet energy',
    price: 350,
    rarity: 'Rare',
    surfaceTop: '#16113A',
    surfaceMid: '#0D0B28',
    surfaceEdge: '#070618',
    linePrimary: '#E0E7FF',
    lineAccentP1: '#00F5FF',
    lineAccentP2: '#C026D3',
    railHex: '#14132E',
    trimHex: '#A5B4FC',
    bgHex: '#04030D',
    floorHex: '#060512',
    floorRingHex: '#4C1D95',
    rimLightHex: '#C084FC',
    softboxHex: '#E0F2FE',
    gridOverlay: true,
  },
  {
    id: 'fire_arena',
    name: 'Fire Arena',
    subtitle: 'Obsidian volcanic bed with molten crimson & orange accents',
    price: 450,
    rarity: 'Rare',
    surfaceTop: '#2B1014',
    surfaceMid: '#19090D',
    surfaceEdge: '#0E0507',
    linePrimary: '#FFE4E6',
    lineAccentP1: '#FB923C',
    lineAccentP2: '#EF4444',
    railHex: '#1F1215',
    trimHex: '#FCA5A5',
    bgHex: '#0A0405',
    floorHex: '#100607',
    floorRingHex: '#7C2D12',
    rimLightHex: '#FB923C',
    softboxHex: '#FFEDD5',
  },
  {
    id: 'ice_arena',
    name: 'Ice Arena',
    subtitle: 'Deep glacier slate surface with crisp white frost & arctic teal lines',
    price: 600,
    rarity: 'Epic',
    surfaceTop: '#173F5F',
    surfaceMid: '#102C44',
    surfaceEdge: '#0A1E30',
    linePrimary: '#FFFFFF',
    lineAccentP1: '#38BDF8',
    lineAccentP2: '#F97316',
    railHex: '#1C3144',
    trimHex: '#E0F2FE',
    bgHex: '#040B14',
    floorHex: '#07111D',
    floorRingHex: '#0284C7',
    rimLightHex: '#7DD3FC',
    softboxHex: '#F0F9FF',
  },
  {
    id: 'golden_arena',
    name: 'Golden Arena',
    subtitle: 'Championship obsidian table trimmed in 24K brushed gold',
    price: 1000,
    rarity: 'Legendary',
    surfaceTop: '#1A1710',
    surfaceMid: '#110F0B',
    surfaceEdge: '#090806',
    linePrimary: '#FEF3C7',
    lineAccentP1: '#FACC15',
    lineAccentP2: '#F97316',
    railHex: '#1C1912',
    trimHex: '#FACC15',
    bgHex: '#060503',
    floorHex: '#0A0905',
    floorRingHex: '#854D0E',
    rimLightHex: '#FDE047',
    softboxHex: '#FEF9C3',
  },
  {
    id: 'cyber_arena',
    name: 'Cyber Arena',
    subtitle: 'Precision telemetry grid bed with teal & signal-amber lines',
    price: 800,
    rarity: 'Epic',
    surfaceTop: '#0B272D',
    surfaceMid: '#071B20',
    surfaceEdge: '#041115',
    linePrimary: '#CCFBF1',
    lineAccentP1: '#2DD4BF',
    lineAccentP2: '#F59E0B',
    railHex: '#0F2229',
    trimHex: '#5EEAD4',
    bgHex: '#03080A',
    floorHex: '#050C0F',
    floorRingHex: '#115E59',
    rimLightHex: '#2DD4BF',
    softboxHex: '#CCFBF1',
    gridOverlay: true,
  },
];

export function getTableThemeConfig(id: TableThemeId): TableThemeConfig {
  return TABLE_THEMES.find((t) => t.id === id) ?? TABLE_THEMES[0];
}
