import React from 'react';
import {
  Crown,
  Feather,
  Flame,
  Gamepad2,
  Ghost,
  Shield,
  Snowflake,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import type { AvatarId } from '@/types/game';

interface PlayerAvatarBadgeProps {
  avatarId: AvatarId;
  colorHex?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PlayerAvatarBadge: React.FC<PlayerAvatarBadgeProps> = ({
  avatarId,
  colorHex = '#00D8F6',
  size = 'md',
  className = '',
}) => {
  const dims =
    size === 'sm'
      ? 'h-9 w-9 rounded-lg'
      : size === 'lg'
      ? 'h-16 w-16 rounded-2xl'
      : 'h-11 w-11 rounded-xl';

  const iconSize =
    size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';

  const renderGlyph = () => {
    switch (avatarId) {
      case 'striker_ace':
        return <Target className={iconSize} style={{ color: colorHex }} />;
      case 'cyber_visor':
        return <Gamepad2 className={iconSize} style={{ color: colorHex }} />;
      case 'flame_fox':
        return <Flame className={iconSize} style={{ color: colorHex }} />;
      case 'ice_wolf':
        return <Snowflake className={iconSize} style={{ color: colorHex }} />;
      case 'titan_helmet':
        return <Shield className={iconSize} style={{ color: colorHex }} />;
      case 'neon_bolt':
        return <Zap className={iconSize} style={{ color: colorHex }} />;
      case 'phantom_mask':
        return <Ghost className={iconSize} style={{ color: colorHex }} />;
      case 'solar_hawk':
        return <Feather className={iconSize} style={{ color: colorHex }} />;
      case 'gold_crown':
        return <Crown className={iconSize} style={{ color: colorHex }} />;
      case 'apex_legend':
        return <Sparkles className={iconSize} style={{ color: colorHex }} />;
    }
  };

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center border bg-[#070B14] shadow-inner ${dims} ${className}`}
      style={{
        borderColor: `${colorHex}80`,
        background: `radial-gradient(circle at 30% 25%, ${colorHex}26, #070B14 75%)`,
      }}
    >
      {renderGlyph()}
    </div>
  );
};
