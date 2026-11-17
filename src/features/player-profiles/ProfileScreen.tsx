import React, { useState } from 'react';
import {
  ArrowLeft,
  Coins,
  Palette,
  ShoppingBag,
  Trophy,
  UserCheck,
} from 'lucide-react';
import { EpicSwingLogo } from '@/components/common/EpicSwingLogo';
import {
  AVATAR_ITEMS,
  STRIKER_STYLES,
  TABLE_THEMES,
  itemKey,
} from '@/config/catalog';
import { PlayerAvatarBadge } from '@/features/player-profiles/PlayerAvatarBadge';
import type { AvatarId, PlayerIdentity, ScreenId } from '@/types/game';

interface ProfileScreenProps {
  profiles: { p1: PlayerIdentity; p2: PlayerIdentity };
  onUpdateProfile: (playerId: 'p1' | 'p2', next: PlayerIdentity) => void;
  onNavigate: (screen: ScreenId) => void;
  onBack: () => void;
  onButtonClick: () => void;
}

const AVATAR_COLORS = [
  '#00D8F6',
  '#FF6B1A',
  '#FF3B2F',
  '#38BDF8',
  '#A855F7',
  '#10B981',
  '#FACC15',
  '#E2E8F0',
];

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  profiles,
  onUpdateProfile,
  onNavigate,
  onBack,
  onButtonClick,
}) => {
  const [activeId, setActiveId] = useState<'p1' | 'p2'>('p1');
  const active = profiles[activeId];

  const winPct =
    active.matchesPlayed > 0
      ? Math.round((active.matchesWon / active.matchesPlayed) * 100)
      : 0;

  const equippedStriker =
    STRIKER_STYLES.find((s) => s.id === active.strikerId)?.name ?? 'Classic';
  const equippedTheme =
    TABLE_THEMES.find((t) => t.id === active.tableThemeId)?.name ??
    'Classic Arcade';

  const selectAvatar = (avatarId: AvatarId) => {
    const owned = active.ownedItems.includes(itemKey('avatars', avatarId));
    if (!owned) return;
    onButtonClick();
    onUpdateProfile(activeId, { ...active, avatarId });
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/82 p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl border border-white/15 bg-[#070B14] p-4 sm:p-6 shadow-2xl max-h-[94vh] flex flex-col">
        {/* Header */}
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

          <EpicSwingLogo variant="compact" />

          <div className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2">
            <Coins className="w-4 h-4 text-amber-300" />
            <span className="font-mono-tabular text-sm font-extrabold text-amber-300">
              {active.coins.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Player 1 / Player 2 Profile Switcher */}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-[#05070C] p-1.5 border border-white/10">
          {(['p1', 'p2'] as const).map((pid) => {
            const prof = profiles[pid];
            const isSel = activeId === pid;
            return (
              <button
                key={pid}
                type="button"
                onClick={() => {
                  onButtonClick();
                  setActiveId(pid);
                }}
                className={`flex min-h-[46px] items-center justify-center gap-2.5 rounded-lg px-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                  isSel
                    ? pid === 'p1'
                      ? 'bg-cyan-400 text-slate-950'
                      : 'bg-orange-500 text-slate-950'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <PlayerAvatarBadge
                  avatarId={prof.avatarId}
                  colorHex={prof.avatarColor}
                  size="sm"
                />
                <span className="truncate">
                  {pid === 'p1' ? 'Player 1: ' : 'Player 2: '}
                  {prof.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex-1 min-h-0 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-5 pr-0.5">
          {/* Left Column: Identity, Name & Stats */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border border-white/10 bg-[#0C1424] p-4">
              <div className="flex items-center gap-3.5">
                <PlayerAvatarBadge
                  avatarId={active.avatarId}
                  colorHex={active.avatarColor}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {activeId === 'p1'
                      ? 'Primary Arcade Profile'
                      : 'Local Rival Profile'}
                  </div>
                  <div className="truncate font-display text-xl font-extrabold text-white">
                    {active.name}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-300">
                    {equippedStriker} · {equippedTheme}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label
                  htmlFor="profile-player-name"
                  className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Edit Player Name</span>
                </label>
                <input
                  id="profile-player-name"
                  type="text"
                  maxLength={18}
                  value={active.name}
                  onChange={(e) =>
                    onUpdateProfile(activeId, {
                      ...active,
                      name: e.target.value,
                    })
                  }
                  onBlur={() => {
                    if (!active.name.trim()) {
                      onUpdateProfile(activeId, {
                        ...active,
                        name: activeId === 'p1' ? 'Player 1' : 'Player 2',
                      });
                    }
                  }}
                  placeholder={activeId === 'p1' ? 'Player 1' : 'Player 2'}
                  className="mt-1.5 w-full min-h-[44px] rounded-xl border border-white/15 bg-[#05070C] px-3.5 text-sm font-semibold text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="mt-4">
                <div className="text-xs font-semibold text-slate-300">
                  Profile Accent Color
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {AVATAR_COLORS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => {
                        onButtonClick();
                        onUpdateProfile(activeId, {
                          ...active,
                          avatarColor: hex,
                        });
                      }}
                      aria-label={`Select accent ${hex}`}
                      className={`h-8 w-8 rounded-lg border-2 transition-transform cursor-pointer ${
                        active.avatarColor === hex
                          ? 'scale-110 border-white'
                          : 'border-white/15 hover:scale-105'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Player Career Metrics */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-xl border border-white/10 bg-[#0C1424] p-3 text-center">
                <div className="text-[11px] text-slate-400">Matches</div>
                <div className="mt-0.5 font-mono-tabular text-xl font-extrabold text-white">
                  {active.matchesPlayed}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0C1424] p-3 text-center">
                <div className="text-[11px] text-slate-400">Won · Lost</div>
                <div className="mt-0.5 font-mono-tabular text-lg font-extrabold text-cyan-300">
                  {active.matchesWon}
                  <span className="text-slate-500"> · </span>
                  <span className="text-orange-400">{active.matchesLost}</span>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0C1424] p-3 text-center">
                <div className="text-[11px] text-slate-400">Win Rate</div>
                <div className="mt-0.5 font-mono-tabular text-xl font-extrabold text-white">
                  {winPct}%
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0C1424] p-3 text-center">
                <div className="text-[11px] text-slate-400">High Score</div>
                <div className="mt-0.5 font-mono-tabular text-xl font-extrabold text-amber-300">
                  {active.highestScore}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0C1424] p-3 text-center">
                <div className="text-[11px] text-slate-400">Win Streak</div>
                <div className="mt-0.5 font-mono-tabular text-xl font-extrabold text-white">
                  {active.winStreak}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0C1424] p-3 text-center">
                <div className="text-[11px] text-slate-400">Top Speed</div>
                <div className="mt-0.5 font-mono-tabular text-lg font-extrabold text-white">
                  {active.fastestShotKmh}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Avatar Selection Grid */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-white/10 bg-[#0C1424] p-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-display text-sm font-bold text-white">
                    Player Avatars
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onButtonClick();
                    onNavigate('store');
                  }}
                  className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 text-xs font-bold text-amber-300 hover:bg-amber-500/20 cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Unlock Avatars</span>
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {AVATAR_ITEMS.map((av) => {
                  const owned = active.ownedItems.includes(
                    itemKey('avatars', av.id)
                  );
                  const equipped = active.avatarId === av.id;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      disabled={!owned}
                      onClick={() => selectAvatar(av.id)}
                      className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${
                        equipped
                          ? 'border-cyan-400 bg-cyan-500/15 cursor-pointer'
                          : owned
                          ? 'border-white/10 bg-[#070B14] hover:border-white/30 cursor-pointer'
                          : 'border-white/5 bg-[#05070C] opacity-55 cursor-not-allowed'
                      }`}
                    >
                      <PlayerAvatarBadge
                        avatarId={av.id}
                        colorHex={owned ? av.previewHex : '#475569'}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-white">
                          {av.name}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400">
                          {equipped
                            ? 'Equipped'
                            : owned
                            ? 'Owned'
                            : `${av.price} Coins`}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => {
                  onButtonClick();
                  onNavigate('customize');
                }}
                className="flex min-h-[44px] items-center gap-2 rounded-xl border border-white/15 bg-[#0E1729] px-4 text-xs font-bold text-white hover:border-cyan-400/60 cursor-pointer"
              >
                <Palette className="w-4 h-4 text-cyan-400" />
                <span>Customize Loadout</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onButtonClick();
                  onBack();
                }}
                className="min-h-[44px] rounded-xl bg-cyan-400 px-5 font-display text-xs font-extrabold text-slate-950 hover:bg-cyan-300 cursor-pointer"
              >
                Save &amp; Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
