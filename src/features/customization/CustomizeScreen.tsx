import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Lock,
  Palette,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import {
  ARENA_BACKGROUNDS,
  GOAL_EFFECTS,
  PUCK_SKINS,
  STRIKER_COLORS,
  STRIKER_STYLES,
  TABLE_THEMES,
  TRAIL_EFFECTS,
  itemKey,
} from '@/config/catalog';
import {
  Preview3DViewport,
  type PreviewMode,
} from '@/features/customization/Preview3DViewport';
import type { PlayerIdentity, ScreenId } from '@/types/game';

interface CustomizeScreenProps {
  profiles: { p1: PlayerIdentity; p2: PlayerIdentity };
  onUpdateProfile: (playerId: 'p1' | 'p2', next: PlayerIdentity) => void;
  onNavigate: (screen: ScreenId) => void;
  onBack: () => void;
  onButtonClick: () => void;
}

type CustomizeTab = 'strikers' | 'colors' | 'themes' | 'pucks' | 'effects';

export const CustomizeScreen: React.FC<CustomizeScreenProps> = ({
  profiles,
  onUpdateProfile,
  onNavigate,
  onBack,
  onButtonClick,
}) => {
  const [activeId, setActiveId] = useState<'p1' | 'p2'>('p1');
  const [tab, setTab] = useState<CustomizeTab>('strikers');

  const active = profiles[activeId];

  const previewMode: PreviewMode =
    tab === 'themes' ? 'theme' : tab === 'pucks' ? 'puck' : 'striker';

  const isOwned = (cat: Parameters<typeof itemKey>[0], id: string) =>
    active.ownedItems.includes(itemKey(cat, id));

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/82 p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-2xl border border-white/15 bg-[#070B14] p-4 sm:p-6 shadow-2xl max-h-[94vh] flex flex-col">
        {/* Top Bar */}
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

          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-cyan-400" />
            <h2 className="font-display text-lg sm:text-xl font-extrabold text-white">
              Customize Loadout
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              onButtonClick();
              onNavigate('store');
            }}
            className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-500/12 px-3.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Game Store</span>
          </button>
        </div>

        {/* P1 / P2 Loadout Selector */}
        <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-xl bg-[#05070C] p-1.5 border border-white/10">
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
                }}
                className={`min-h-[42px] rounded-lg px-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                  selected
                    ? pid === 'p1'
                      ? 'bg-cyan-400 text-slate-950'
                      : 'bg-orange-500 text-slate-950'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {pid === 'p1' ? `P1 · ${prof.name}` : `P2 · ${prof.name}`}
              </button>
            );
          })}
        </div>

        {/* Main Split: Live Interactive 3D Preview + Customization Controls */}
        <div className="mt-4 flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto">
          {/* Live 3D Viewport */}
          <div className="lg:col-span-5 flex flex-col rounded-xl border border-white/12 bg-[#05070C] overflow-hidden">
            <Preview3DViewport
              mode={previewMode}
              strikerStyle={active.strikerId}
              strikerColor={active.strikerColorId}
              customColorHex={active.customColorHex}
              tableTheme={active.tableThemeId}
              puckSkin={active.puckSkinId}
              className="h-56 sm:h-72 lg:h-80 w-full"
            />
            <div className="border-t border-white/10 bg-[#0C1424] px-4 py-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                  Live 3D Preview · {active.name}
                </div>
                <div className="truncate text-xs text-slate-200 mt-0.5">
                  {STRIKER_STYLES.find((s) => s.id === active.strikerId)?.name}{' '}
                  ·{' '}
                  {TABLE_THEMES.find((t) => t.id === active.tableThemeId)?.name}
                </div>
              </div>
              {activeId === 'p2' && tab === 'themes' && (
                <span className="text-[10px] font-semibold text-slate-400">
                  Arena uses P1 table theme
                </span>
              )}
            </div>
          </div>

          {/* Right Panel: Category Tabs & Items */}
          <div className="lg:col-span-7 flex flex-col min-h-0">
            <div className="flex flex-wrap gap-1.5 rounded-xl bg-[#05070C] p-1.5 border border-white/10">
              {(
                [
                  { id: 'strikers', label: 'Strikers' },
                  { id: 'colors', label: 'Striker Color' },
                  { id: 'themes', label: 'Table Themes' },
                  { id: 'pucks', label: 'Puck Skins' },
                  { id: 'effects', label: 'VFX & Arena' },
                ] as Array<{ id: CustomizeTab; label: string }>
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onButtonClick();
                    setTab(t.id);
                  }}
                  className={`flex-1 min-w-[82px] min-h-[38px] rounded-lg px-2.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    tab === t.id
                      ? 'bg-cyan-400 text-slate-950'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[360px]">
              {/* STRIKERS TAB */}
              {tab === 'strikers' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {STRIKER_STYLES.map((st) => {
                    const owned = isOwned('strikers', st.id);
                    const equipped = active.strikerId === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          onButtonClick();
                          if (owned) {
                            onUpdateProfile(activeId, {
                              ...active,
                              strikerId: st.id,
                            });
                          } else {
                            onNavigate('store');
                          }
                        }}
                        className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                          equipped
                            ? 'border-cyan-400 bg-cyan-500/14'
                            : owned
                            ? 'border-white/10 bg-[#0C1424] hover:border-white/30'
                            : 'border-white/8 bg-[#05070C] opacity-75 hover:border-amber-400/40'
                        }`}
                      >
                        <div
                          className="mt-0.5 h-8 w-8 shrink-0 rounded-full border-2 border-white/25"
                          style={{
                            background: `radial-gradient(circle at 35% 35%, ${st.previewHex}, ${
                              st.accentHex ?? '#0B101B'
                            })`,
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate text-xs font-bold text-white">
                              {st.name}
                            </span>
                            {equipped ? (
                              <Check className="w-4 h-4 text-cyan-300 shrink-0" />
                            ) : !owned ? (
                              <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-2">
                            {st.subtitle}
                          </p>
                          <div className="mt-1 text-[10px] font-bold uppercase tracking-wider">
                            {equipped ? (
                              <span className="text-cyan-300">Equipped</span>
                            ) : owned ? (
                              <span className="text-slate-300">Tap to Equip</span>
                            ) : (
                              <span className="text-amber-300">
                                Unlock · {st.price} Coins
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* STRIKER COLORS TAB */}
              {tab === 'colors' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {STRIKER_COLORS.map((c) => {
                      const owned = isOwned('colors', c.id);
                      const equipped = active.strikerColorId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            onButtonClick();
                            if (owned) {
                              onUpdateProfile(activeId, {
                                ...active,
                                strikerColorId: c.id,
                              });
                            } else {
                              onNavigate('store');
                            }
                          }}
                          className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                            equipped
                              ? 'border-cyan-400 bg-cyan-500/14'
                              : owned
                              ? 'border-white/10 bg-[#0C1424] hover:border-white/30'
                              : 'border-white/8 bg-[#05070C] opacity-75 hover:border-amber-400/40'
                          }`}
                        >
                          <span
                            className="h-7 w-7 shrink-0 rounded-full border border-white/30"
                            style={{
                              backgroundColor:
                                c.id === 'custom'
                                  ? active.customColorHex
                                  : c.hex,
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-bold text-white">
                              {c.name}
                            </div>
                            <div className="text-[10px] font-semibold">
                              {equipped ? (
                                <span className="text-cyan-300">Active</span>
                              ) : owned ? (
                                <span className="text-slate-300">Owned</span>
                              ) : (
                                <span className="text-amber-300">
                                  {c.price} Coins
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {isOwned('colors', 'custom') && (
                    <div className="flex items-center justify-between rounded-xl border border-cyan-400/35 bg-[#0C1424] p-3.5">
                      <div>
                        <div className="text-xs font-bold text-white">
                          Custom Color Studio
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Pick any hex color for your striker
                        </div>
                      </div>
                      <input
                        type="color"
                        value={active.customColorHex}
                        onChange={(e) =>
                          onUpdateProfile(activeId, {
                            ...active,
                            strikerColorId: 'custom',
                            customColorHex: e.target.value,
                          })
                        }
                        aria-label="Custom striker color picker"
                        className="h-10 w-16 cursor-pointer rounded-lg border border-white/20 bg-transparent"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* TABLE THEMES TAB */}
              {tab === 'themes' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TABLE_THEMES.map((th) => {
                    const owned = isOwned('themes', th.id);
                    const equipped = active.tableThemeId === th.id;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => {
                          onButtonClick();
                          if (owned) {
                            onUpdateProfile(activeId, {
                              ...active,
                              tableThemeId: th.id,
                            });
                          } else {
                            onNavigate('store');
                          }
                        }}
                        className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                          equipped
                            ? 'border-cyan-400 bg-cyan-500/14'
                            : owned
                            ? 'border-white/10 bg-[#0C1424] hover:border-white/30'
                            : 'border-white/8 bg-[#05070C] opacity-75 hover:border-amber-400/40'
                        }`}
                      >
                        <div
                          className="mt-0.5 h-9 w-9 shrink-0 rounded-lg border border-white/20"
                          style={{
                            background: `linear-gradient(135deg, ${th.surfaceTop}, ${th.surfaceEdge})`,
                            boxShadow: `inset 0 0 0 2px ${th.lineAccentP1}`,
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate text-xs font-bold text-white">
                              {th.name}
                            </span>
                            {equipped ? (
                              <Check className="w-4 h-4 text-cyan-300 shrink-0" />
                            ) : !owned ? (
                              <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {th.subtitle}
                          </p>
                          <div className="mt-1 text-[10px] font-bold uppercase tracking-wider">
                            {equipped ? (
                              <span className="text-cyan-300">Active Table</span>
                            ) : owned ? (
                              <span className="text-slate-300">Owned</span>
                            ) : (
                              <span className="text-amber-300">
                                {th.price} Coins
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* PUCK SKINS TAB */}
              {tab === 'pucks' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PUCK_SKINS.map((pk) => {
                    const owned = isOwned('pucks', pk.id);
                    const equipped = active.puckSkinId === pk.id;
                    return (
                      <button
                        key={pk.id}
                        type="button"
                        onClick={() => {
                          onButtonClick();
                          if (owned) {
                            onUpdateProfile(activeId, {
                              ...active,
                              puckSkinId: pk.id,
                            });
                          } else {
                            onNavigate('store');
                          }
                        }}
                        className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                          equipped
                            ? 'border-cyan-400 bg-cyan-500/14'
                            : owned
                            ? 'border-white/10 bg-[#0C1424] hover:border-white/30'
                            : 'border-white/8 bg-[#05070C] opacity-75 hover:border-amber-400/40'
                        }`}
                      >
                        <div
                          className="mt-0.5 h-8 w-8 shrink-0 rounded-full border-4"
                          style={{
                            backgroundColor: pk.previewHex,
                            borderColor: pk.accentHex ?? '#0B101B',
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white">
                            {pk.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {pk.subtitle}
                          </div>
                          <div className="mt-1 text-[10px] font-bold uppercase">
                            {equipped ? (
                              <span className="text-cyan-300">Equipped</span>
                            ) : owned ? (
                              <span className="text-slate-300">Tap to Equip</span>
                            ) : (
                              <span className="text-amber-300">
                                {pk.price} Coins
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* VFX & ARENA BACKGROUNDS TAB */}
              {tab === 'effects' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Puck Trail Effects</span>
                    </div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {TRAIL_EFFECTS.map((tr) => {
                        const owned = isOwned('vfx', tr.id);
                        const equipped = active.trailEffectId === tr.id;
                        return (
                          <button
                            key={tr.id}
                            type="button"
                            onClick={() => {
                              onButtonClick();
                              if (owned) {
                                onUpdateProfile(activeId, {
                                  ...active,
                                  trailEffectId: tr.id,
                                });
                              } else {
                                onNavigate('store');
                              }
                            }}
                            className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left cursor-pointer ${
                              equipped
                                ? 'border-cyan-400 bg-cyan-500/14'
                                : owned
                                ? 'border-white/10 bg-[#0C1424]'
                                : 'border-white/8 bg-[#05070C] opacity-70'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="h-3.5 w-3.5 rounded-full shrink-0"
                                style={{ backgroundColor: tr.previewHex }}
                              />
                              <span className="truncate text-xs font-bold text-white">
                                {tr.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-300">
                              {equipped ? 'On' : owned ? 'Owned' : `${tr.price}c`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-orange-400">
                      Goal Explosion Effects
                    </div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {GOAL_EFFECTS.map((gf) => {
                        const owned = isOwned('goal_fx', gf.id);
                        const equipped = active.goalEffectId === gf.id;
                        return (
                          <button
                            key={gf.id}
                            type="button"
                            onClick={() => {
                              onButtonClick();
                              if (owned) {
                                onUpdateProfile(activeId, {
                                  ...active,
                                  goalEffectId: gf.id,
                                });
                              } else {
                                onNavigate('store');
                              }
                            }}
                            className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left cursor-pointer ${
                              equipped
                                ? 'border-cyan-400 bg-cyan-500/14'
                                : owned
                                ? 'border-white/10 bg-[#0C1424]'
                                : 'border-white/8 bg-[#05070C] opacity-70'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="h-3.5 w-3.5 rounded-full shrink-0"
                                style={{ backgroundColor: gf.previewHex }}
                              />
                              <span className="truncate text-xs font-bold text-white">
                                {gf.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-300">
                              {equipped ? 'On' : owned ? 'Owned' : `${gf.price}c`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-200">
                      Arena Backgrounds
                    </div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ARENA_BACKGROUNDS.map((bg) => {
                        const owned = isOwned('backgrounds', bg.id);
                        const equipped = active.arenaBgId === bg.id;
                        return (
                          <button
                            key={bg.id}
                            type="button"
                            onClick={() => {
                              onButtonClick();
                              if (owned) {
                                onUpdateProfile(activeId, {
                                  ...active,
                                  arenaBgId: bg.id,
                                });
                              } else {
                                onNavigate('store');
                              }
                            }}
                            className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left cursor-pointer ${
                              equipped
                                ? 'border-cyan-400 bg-cyan-500/14'
                                : owned
                                ? 'border-white/10 bg-[#0C1424]'
                                : 'border-white/8 bg-[#05070C] opacity-70'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="h-4 w-4 rounded border border-white/25 shrink-0"
                                style={{ backgroundColor: bg.previewHex }}
                              />
                              <span className="truncate text-xs font-bold text-white">
                                {bg.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-300">
                              {equipped ? 'On' : owned ? 'Owned' : `${bg.price}c`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
