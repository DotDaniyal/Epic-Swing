import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { EpicSwingLogo } from '@/components/common/EpicSwingLogo';

interface LoadingScreenProps {
  ready: boolean;
  onComplete: () => void;
  reducedMotion: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  ready,
  onComplete,
  reducedMotion,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const handleFinish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current();
  };

  useEffect(() => {
    if (!barRef.current) return;
    if (reducedMotion) {
      barRef.current.style.transform = 'scaleX(1)';
      return;
    }

    const tl = gsap.timeline();
    tl.fromTo(
      barRef.current,
      { scaleX: 0.1 },
      { scaleX: 1, duration: 0.5, ease: 'power2.out' }
    );

    return () => {
      tl.kill();
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (!ready || !containerRef.current || completedRef.current) return;
    const delay = reducedMotion ? 80 : 350;
    let fadeTween: gsap.core.Tween | null = null;
    const timer = window.setTimeout(() => {
      if (!containerRef.current || reducedMotion) {
        handleFinish();
        return;
      }
      fadeTween = gsap.to(containerRef.current, {
        opacity: 0,
        duration: 0.25,
        ease: 'power2.out',
        onComplete: handleFinish,
      });
    }, delay);

    return () => {
      window.clearTimeout(timer);
      fadeTween?.kill();
    };
  }, [ready, reducedMotion]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#05070C] px-6 transition-opacity"
    >
      <div className="flex flex-col items-center">
        <EpicSwingLogo variant="hero" />

        <div className="mt-7 h-1.5 w-52 overflow-hidden rounded-sm bg-slate-800">
          <div
            ref={barRef}
            className="h-full w-full origin-left bg-gradient-to-r from-cyan-400 to-orange-500"
            style={{ transform: 'scaleX(0.1)' }}
          />
        </div>
        <p className="mt-2.5 text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
          Initializing Arena
        </p>
      </div>
    </div>
  );
};
