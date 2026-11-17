import React, { useEffect, useRef } from 'react';
import { Coins, Sparkles } from 'lucide-react';
import { animateCoinBurst } from '@/animations/timelines';

interface CoinBurstOverlayProps {
  visible: boolean;
  amount?: number;
  title: string;
  subtitle?: string;
  reducedMotion: boolean;
  onDone?: () => void;
}

export const CoinBurstOverlay: React.FC<CoinBurstOverlayProps> = ({
  visible,
  amount,
  title,
  subtitle,
  reducedMotion,
  onDone,
}) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<HTMLDivElement | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!visible || !wrapRef.current) return;

    if (reducedMotion) {
      const t = window.setTimeout(() => onDoneRef.current?.(), 1400);
      return () => window.clearTimeout(t);
    }

    const tl = animateCoinBurst(wrapRef.current, particlesRef.current, () => {
      onDoneRef.current?.();
    });

    return () => {
      tl.kill();
    };
  }, [visible, reducedMotion]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        ref={wrapRef}
        className="relative flex flex-col items-center rounded-2xl border-2 border-amber-400/70 bg-[#070B14]/95 px-7 py-5 text-center shadow-2xl"
      >
        <div
          ref={particlesRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="absolute h-2.5 w-2.5 rounded-full bg-amber-300"
            />
          ))}
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
          {amount !== undefined ? (
            <Coins className="w-6 h-6" />
          ) : (
            <Sparkles className="w-6 h-6" />
          )}
        </div>
        <div className="mt-2.5 font-display text-lg font-extrabold text-white">
          {title}
        </div>
        {amount !== undefined && (
          <div className="mt-1 font-mono-tabular text-2xl font-extrabold text-amber-300">
            +{amount} Coins
          </div>
        )}
        {subtitle && (
          <div className="mt-1 text-xs font-medium text-slate-300">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
