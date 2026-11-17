import React from 'react';

interface EpicSwingLogoProps {
  variant?: 'hero' | 'compact' | 'cinematic';
  className?: string;
}

export const EpicSwingLogo: React.FC<EpicSwingLogoProps> = ({
  variant = 'hero',
  className = '',
}) => {
  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2.5 ${className}`}>
        <svg
          width="30"
          height="30"
          viewBox="0 0 64 64"
          fill="none"
          aria-hidden="true"
          className="shrink-0"
        >
          <defs>
            <linearGradient id="esCompactCyan" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38F2FF" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
            <linearGradient id="esCompactOrange" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FF9F43" />
              <stop offset="100%" stopColor="#FF3B2F" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill="#070B14" stroke="#334155" strokeWidth="2.5" />
          <path d="M 10 42 A 24 24 0 0 1 32 8" stroke="url(#esCompactCyan)" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M 54 22 A 24 24 0 0 1 32 56" stroke="url(#esCompactOrange)" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="32" cy="32" r="14" fill="#0F172A" stroke="#CBD5E1" strokeWidth="2.5" />
          <circle cx="32" cy="32" r="6" fill="#00E5FF" />
        </svg>
        <div className="flex items-baseline gap-1 font-display font-extrabold tracking-wider whitespace-nowrap">
          <span className="text-sm sm:text-base text-white">EPIC</span>
          <span className="text-sm sm:text-base text-cyan-400">SWING</span>
        </div>
      </div>
    );
  }

  const isCinematic = variant === 'cinematic';

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <div className="relative flex items-center justify-center">
        <svg
          width={isCinematic ? '148' : '96'}
          height={isCinematic ? '148' : '96'}
          viewBox="0 0 140 140"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="esChromeRim" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F8FAFC" />
              <stop offset="45%" stopColor="#94A3B8" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
            <linearGradient id="esCyan" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#67F5FF" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
            <linearGradient id="esOrange" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFB347" />
              <stop offset="100%" stopColor="#FF3B2F" />
            </linearGradient>
          </defs>

          {/* Outer Speed Slash Trails */}
          <path
            d="M 14 70 L 34 70 M 106 70 L 126 70"
            stroke="#E2E8F0"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 22 44 L 38 52 M 102 88 L 118 96"
            stroke="#00E5FF"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M 22 96 L 38 88 M 102 52 L 118 44"
            stroke="#FF6B1A"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Kinetic Velocity Arcs */}
          <path
            d="M 28 96 A 48 48 0 0 1 70 22"
            stroke="url(#esCyan)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M 112 44 A 48 48 0 0 1 70 118"
            stroke="url(#esOrange)"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Metallic Striker Bezel */}
          <circle
            cx="70"
            cy="70"
            r="36"
            fill="#070B14"
            stroke="url(#esChromeRim)"
            strokeWidth="5"
          />
          {/* Inner Striker & Puck Impact Core */}
          <circle
            cx="70"
            cy="70"
            r="22"
            fill="#0F172A"
            stroke="#00D8F6"
            strokeWidth="3.5"
          />
          <circle cx="70" cy="70" r="10" fill="#FF6B1A" />
          <circle cx="70" cy="70" r="4" fill="#F8FAFC" />
        </svg>
      </div>

      <div className="mt-2 flex flex-col items-center text-center">
        <div
          className={`font-display font-extrabold tracking-[0.12em] uppercase leading-none ${
            isCinematic ? 'text-4xl sm:text-6xl' : 'text-2xl sm:text-3xl'
          }`}
        >
          <span className="bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            EPIC{' '}
          </span>
          <span className="bg-gradient-to-r from-cyan-300 via-cyan-400 to-orange-400 bg-clip-text text-transparent">
            SWING
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="h-[2px] w-7 bg-cyan-400" />
          <span className="text-[10px] sm:text-xs font-bold tracking-[0.28em] text-slate-300 uppercase">
            Arcade Air Hockey
          </span>
          <span className="h-[2px] w-7 bg-orange-500" />
        </div>
      </div>
    </div>
  );
};
