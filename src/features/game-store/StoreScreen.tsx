import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Coins,
  Lock,
  ShoppingBag,
} from 'lucide-react';
import { EpicSwingLogo } from '@/components/common/EpicSwingLogo';
import { getStoreCatalogByCategory, itemKey } from '@/config/catalog';
import { CoinBurstOverlay } from '@/features/coin-system/CoinBurstOverlay';
import { Preview3DViewport } from '@/features/customization/Preview3DViewport';
import { PlayerAvatarBadge } from '@/features/player-profiles/PlayerAvatarBadge';
import type {
  AvatarId,
  PlayerIdentity,
  PuckSkinId,
  StoreCatalogItem,
  StoreCategory,
  StrikerColorId,
  StrikerStyleId,
  TableThemeId,
} from '@/types/game';

interface StoreScreenProps {
  profiles: { p1: PlayerIdentity; p2: PlayerIdentity };
  reducedMotion: boolean;
  onPurchase: (
    playerId: 'p1' | 'p2',
    category: StoreCategory,
    item: StoreCatalogItem
  ) => { ok: boolean; reason?: string };
  onEquip: (
    playerId: 'p1' | 'p2',
    category: StoreCategory,
    itemId: string
  ) => void;
  onBack: () => void;
  onButtonClick: () => void;
}

const STORE_CATEGORIES: Array<{ id: StoreCategory; label: string }> = [
  { id: 'strikers', label: 'Strikers' },
  { id: 'colors', label: 'Striker Colors' },
  { id: 'themes', label: 'Table Themes' },
  { id: 'avatars', label: 'Avatars' },
  { id: 'vfx', label: 'Visual FX' },
  { id: 'goal_fx', label: 'Goal FX' },
  { id: 'pucks', label: 'Puck Skins' },
  { id: 'backgrounds', label: 'Backgrounds' },
];

export const StoreScreen: React.FC<StoreScreenProps> = ({
  profiles,
  reducedMotion,
  onPurchase,
  onEquip,
  onBack,
  onButtonClick,
}) => {
  const [activeId, setActiveId] = useState<'p1' | 'p2'>('p1');
  const [category, setCategory] = useState<StoreCategory>('strikers');
  const [selectedItemId, setSelectedItemId] = useState<string>('purple_electric');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{
    visible: boolean;
    title: string;
    subtitle: string;
  }>({ visible: false, title: '', subtitle: '' });

  const active = profiles[activeId];
  const items = useMemo(() => getStoreCatalogByCategory(category), [category]);

  const inspectedItem =
    items.find((x) => x.id === selectedItemId) ?? items[0];

  const isEquipped = (cat: StoreCategory, id: string): boolean => {
    switch (cat) {
      case 'strikers':
        return active.strikerId === id;
      case 'colors':
        return active.strikerColorId === id;
      case 'themes':
        return active.tableThemeId === id;
      case 'avatars':
        return active.avatarId === id;
      case 'vfx':
        return active.trailEffectId === id;
      case 'goal_fx':
        return active.goalEffectId === id;
      case 'pucks':
        return active.puckSkinId === id;
      case 'backgrounds':
        return active.arenaBgId === id;
    }
  };

  const handleCategorySwitch = (nextCat: StoreCategory) => {
    onButtonClick();
    setCategory(nextCat);
    setErrorMsg(null);
    const list = getStoreCatalogByCategory(nextCat);
    if (list[0]) setSelectedItemId(list[0].id);
  };

  const handleBuyOrEquip = (item: StoreCatalogItem) => {
    setErrorMsg(null);
    const key = itemKey(category, item.id);
    const owned = active.ownedItems.includes(key);

    if (owned) {
      onButtonClick();
      onEquip(activeId, category, item.id);
      return;
    }

    const res = onPurchase(activeId, category, item);
    if (!res.ok) {
      onButtonClick();
      setErrorMsg(
        `Not enough coins for ${item.name}. Need ${
          item.price - active.coins
        } more coins.`
      );
      return;
    }

    onEquip(activeId, category, item.id);
    setCelebration({
      visible: true,
      title: `Unlocked & Equipped!`,
      subtitle: `${item.name} added to ${active.name}'s inventory`,
    });
  };

  const inspectedOwned = active.ownedItems.includes(
    itemKey(category, inspectedItem.id)
  );
  const inspectedEquipped = isEquipped(category, inspectedItem.id);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/85 p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-2xl border border-white/15 bg-[#070B14] p-4 sm:p-6 shadow-2xl max-h-[94vh] flex flex-col">
        {/* Top Store Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
          <button
            type="button"
            onClick={() => {
              onButtonClick();
              onBack();
            }}
            className="flex min-h-[44px] items-center gap-2 rounded-lg border border-white/10 bg-[#0E1729] px-3 text-xs font-semibold text-slate-200 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Menu</span>
          </button>

          <div className="flex items-center gap-2.5">
            <EpicSwingLogo variant="compact" />
            <span className="text-slate-600">·</span>
            <span className="font-display text-sm sm:text-base font-extrabold text-amber-300">
              GAME STORE
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/12 px-3.5 py-2">
            <Coins className="w-4 h-4 text-amber-300" />
            <span className="font-mono-tabular text-sm font-extrabold text-amber-300">
              {active.coins.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Wallet / Buyer Switcher (Separate P1 & P2 Ownership) */}
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-[#05070C] p-1.5 border border-white/10">
          {(['p1', 'p2'] as const).map((pid) => {
            const prof = profiles[pid];
            const selected = activeId === pid;
            return (
              <button
                key={pid}
                type="button"
                onClick={() => {
                  onButtonClick();
                  setActiveId(pid);
                  setErrorMsg(null);
                }}
                className={`flex min-h-[42px] items-center justify-between gap-2 rounded-lg px-3.5 text-xs font-bold transition-colors cursor-pointer ${
                  selected
                    ? pid === 'p1'
                      ? 'bg-cyan-400 text-slate-950'
                      : 'bg-orange-500 text-slate-950'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="truncate">
                  {pid === 'p1' ? 'P1' : 'P2'} · {prof.name}
                </span>
                <span className="font-mono-tabular shrink-0">
                  {prof.coins.toLocaleString()} c
                </span>
              </button>
            );
          })}
        </div>

        {/* Category Navigation Tabs */}
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {STORE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategorySwitch(cat.id)}
              className={`min-h-[38px] shrink-0 rounded-lg px-3 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                category === cat.id
                  ? 'bg-cyan-400 text-slate-950'
                  : 'border border-white/10 bg-[#0C1424] text-slate-300 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {errorMsg && (
          <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-red-500/45 bg-red-500/15 px-3.5 py-2.5 text-xs font-semibold text-red-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Store Split: Live Preview Inspector + Item Grid */}
        <div className="mt-3 flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto">
          {/* Inspector Card */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-white/12 bg-[#05070C] overflow-hidden">
            {category === 'strikers' ||
            category === 'colors' ||
            category === 'themes' ||
            category === 'pucks' ? (
              <Preview3DViewport
                mode={
                  category === 'themes'
                    ? 'theme'
                    : category === 'pucks'
                    ? 'puck'
                    : 'striker'
                }
                strikerStyle={
                  category === 'strikers'
                    ? (inspectedItem.id as StrikerStyleId)
                    : active.strikerId
                }
                strikerColor={
                  category === 'colors'
                    ? (inspectedItem.id as StrikerColorId)
                    : active.strikerColorId
                }
                customColorHex={active.customColorHex}
                tableTheme={
                  category === 'themes'
                    ? (inspectedItem.id as TableThemeId)
                    : active.tableThemeId
                }
                puckSkin={
                  category === 'pucks'
                    ? (inspectedItem.id as PuckSkinId)
                    : active.puckSkinId
                }
                className="h-52 sm:h-64 w-full"
              />
            ) : (
              <div className="flex h-52 sm:h-64 items-center justify-center bg-[#080E1B] p-6">
                {category === 'avatars' ? (
                  <PlayerAvatarBadge
                    avatarId={inspectedItem.id as AvatarId}
                    colorHex={inspectedItem.previewHex}
                    size="lg"
                  />
                ) : (
                  <div
                    className="h-28 w-28 rounded-2xl border-2 border-white/25 shadow-2xl"
                    style={{
                      background: `radial-gradient(circle, ${inspectedItem.previewHex}, ${
                        inspectedItem.accentHex ?? '#05070C'
                      })`,
                    }}
                  />
                )}
              </div>
            )}

            <div className="border-t border-white/10 bg-[#0C1424] p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                    {inspectedItem.rarity}
                  </div>
                  <h3 className="font-display text-lg font-extrabold text-white">
                    {inspectedItem.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-300">
                    {inspectedItem.subtitle}
                  </p>
                </div>
                <div className="shrink-0 text-right font-mono-tabular text-sm font-extrabold text-amber-300">
                  {inspectedItem.price === 0
                    ? 'FREE'
                    : `${inspectedItem.price.toLocaleString()} c`}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleBuyOrEquip(inspectedItem)}
                className={`flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl font-display text-sm font-extrabold transition-colors cursor-pointer ${
                  inspectedEquipped
                    ? 'border border-cyan-400/50 bg-cyan-500/18 text-cyan-300'
                    : inspectedOwned
                    ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                    : active.coins >= inspectedItem.price
                    ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                    : 'border border-white/15 bg-[#0E1729] text-slate-300 hover:border-red-400/50'
                }`}
              >
                {inspectedEquipped ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Equipped</span>
                  </>
                ) : inspectedOwned ? (
                  <span>Equip Now</span>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>
                      Buy for {inspectedItem.price.toLocaleString()} Coins
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Store Items Catalog Grid */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5 content-start overflow-y-auto max-h-[400px] pr-1">
            {items.map((item) => {
              const owned = active.ownedItems.includes(itemKey(category, item.id));
              const equipped = isEquipped(category, item.id);
              const selected = inspectedItem.id === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onButtonClick();
                    setSelectedItemId(item.id);
                    setErrorMsg(null);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedItemId(item.id);
                    }
                  }}
                  className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                    selected
                      ? 'border-cyan-400 bg-cyan-500/10'
                      : 'border-white/10 bg-[#0C1424] hover:border-white/25'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {category === 'avatars' ? (
                      <PlayerAvatarBadge
                        avatarId={item.id as AvatarId}
                        colorHex={item.previewHex}
                        size="sm"
                      />
                    ) : (
                      <div
                        className="mt-0.5 h-9 w-9 shrink-0 rounded-lg border border-white/25"
                        style={{
                          background: `linear-gradient(135deg, ${item.previewHex}, ${
                            item.accentHex ?? '#070B14'
                          })`,
                        }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="truncate text-xs font-bold text-white">
                          {item.name}
                        </span>
                        {equipped ? (
                          <Check className="w-4 h-4 text-cyan-300 shrink-0" />
                        ) : !owned ? (
                          <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-2">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-2.5">
                    <span className="font-mono-tabular text-xs font-extrabold text-amber-300">
                      {owned
                        ? equipped
                          ? 'Equipped'
                          : 'Owned'
                        : item.price === 0
                        ? 'Free'
                        : `${item.price.toLocaleString()} Coins`}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItemId(item.id);
                        handleBuyOrEquip(item);
                      }}
                      className={`min-h-[34px] rounded-lg px-3 text-[11px] font-extrabold transition-colors cursor-pointer ${
                        equipped
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : owned
                          ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                          : active.coins >= item.price
                          ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                          : 'border border-white/15 bg-[#05070C] text-slate-400'
                      }`}
                    >
                      {equipped ? 'Equipped' : owned ? 'Equip' : 'Purchase'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <CoinBurstOverlay
        visible={celebration.visible}
        title={celebration.title}
        subtitle={celebration.subtitle}
        reducedMotion={reducedMotion}
        onDone={() => setCelebration((prev) => ({ ...prev, visible: false }))}
      />
    </div>
  );
};
