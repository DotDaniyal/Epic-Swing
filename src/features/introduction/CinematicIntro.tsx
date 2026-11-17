import React, { useEffect, useRef, useState } from 'react';
import { FastForward } from 'lucide-react';
import {
  animateIntroScene1Particles,
  animateIntroScene2Logo,
  INTRO_TIMINGS_MS,
} from '@/animations/timelines';
import { EpicSwingLogo } from '@/components/common/EpicSwingLogo';
import type { CinematicStage } from '@/game/engine/AirHockeyEngine';

interface CinematicIntroProps {
  reducedMotion: boolean;
  goalScoredInDemo: boolean;
  onStageChange: (stage: CinematicStage) => void;
  onPlaySweep: () => void;
  onPlayImpact: () => void;
  onComplete: () => void;
}

type IntroSceneNumber = 1 | 2 | 3 | 4 | 5;

const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: `${(i * 37) % 100}%`,
  top: `${(i * 53) % 100}%`,
  isCyan: i % 2 === 0,
  size: i % 3 === 0 ? 5 : 3,
}));

export const CinematicIntro: React.FC<CinematicIntroProps> = ({
  reducedMotion,
  goalScoredInDemo,
  onStageChange,
  onPlaySweep,
  onPlayImpact,
  onComplete,
}) => {
  const [sceneNum, setSceneNum] = useState<IntroSceneNumber>(1);
  const [showGoalBanner, setShowGoalBanner] = useState(false);

  const sweepRef = useRef<HTMLDivElement | null>(null);
  const logoWrapRef = useRef<HTMLDivElement | null>(null);
  const ringSweepRef = useRef<HTMLDivElement | null>(null);
  const particlesWrapRef = useRef<HTMLDivElement | null>(null);
  const completedRef = useRef(false);

  const finishIntro = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onStageChange('none');
    onComplete();
  };

  useEffect(() => {
    if (goalScoredInDemo && sceneNum === 4) {
      setShowGoalBanner(true);
    }
  }, [goalScoredInDemo, sceneNum]);

  useEffect(() => {
    if (reducedMotion) {
      onStageChange('menu_blend');
      const t = window.setTimeout(finishIntro, 900);
      return () => window.clearTimeout(t);
    }

    const timers: number[] = [];

    // SCENE 1: Dark Screen + Electric Particles + Light Sweep
    setSceneNum(1);
    onStageChange('none');
    onPlaySweep();
    animateIntroScene1Particles(particlesWrapRef.current, sweepRef.current);

    // SCENE 2: Metallic EPIC SWING Logo Reveal
    timers.push(
      window.setTimeout(() => {
        setSceneNum(2);
        onPlayImpact();
        animateIntroScene2Logo(logoWrapRef.current, ringSweepRef.current);
      }, INTRO_TIMINGS_MS.LOGO_REVEAL)
    );

    // SCENE 3: 3D Air Hockey Table Reveal
    timers.push(
      window.setTimeout(() => {
        setSceneNum(3);
        onStageChange('table_reveal');
      }, INTRO_TIMINGS_MS.TABLE_REVEAL)
    );

    // SCENE 4: Animated 3D Gameplay Cinematic + Goal + Score + Logo
    timers.push(
      window.setTimeout(() => {
        setSceneNum(4);
        setShowGoalBanner(false);
        onStageChange('gameplay_rally');
      }, INTRO_TIMINGS_MS.GAMEPLAY_RALLY)
    );

    // Fallback banner near end of rally if physics goal occurred slightly earlier/later
    timers.push(
      window.setTimeout(() => {
        setShowGoalBanner(true);
      }, INTRO_TIMINGS_MS.FALLBACK_GOAL_BANNER)
    );

    // SCENE 5: Smooth Transition into Main Menu
    timers.push(
      window.setTimeout(() => {
        setSceneNum(5);
        onStageChange('menu_blend');
      }, INTRO_TIMINGS_MS.MENU_BLEND)
    );

    timers.push(
      window.setTimeout(() => {
        finishIntro();
      }, INTRO_TIMINGS_MS.COMPLETE)
    );

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
    // Run intro timeline once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDarkOverlayScene = sceneNum === 1 || sceneNum === 2;

  return (
    <div
      className={`fixed inset-0 z-40 flex flex-col items-center justify-center transition-colors duration-700 ${
        isDarkOverlayScene
          ? 'bg-[#030509]'
          : sceneNum === 5
          ? 'bg-transparent pointer-events-none'
          : 'bg-black/10'
      }`}
    >
      {/* Skip Intro Button (always reachable) */}
      {sceneNum < 5 && (
        <button
          type="button"
          onClick={finishIntro}
          className="fixed top-4 right-4 z-50 flex min-h-[44px] items-center gap-2 rounded-xl border border-white/20 bg-[#070B14]/90 px-4 text-xs font-bold uppercase tracking-wider text-slate-200 hover:border-cyan-400 hover:text-white cursor-pointer pointer-events-auto"
        >
          <span>Skip Intro</span>
          <FastForward className="w-4 h-4 text-cyan-400" />
        </button>
      )}

      {/* Scene 1 & 2 Particle & Light Sweep Stage */}
      {isDarkOverlayScene && (
        <>
          <div
            ref={particlesWrapRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            {PARTICLES.map((pt) => (
              <span
                key={pt.id}
                className="absolute rounded-full"
                style={{
                  left: pt.left,
                  top: pt.top,
                  width: `${pt.size}px`,
                  height: `${pt.size}px`,
                  backgroundColor: pt.isCyan ? '#00E5FF' : '#FF6B1A',
                  boxShadow: pt.isCyan
                    ? '0 0 10px #00E5FF'
                    : '0 0 10px #FF6B1A',
                }}
              />
            ))}
          </div>

          <div
            ref={sweepRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-44 -skew-x-12 bg-gradient-to-r from-transparent via-cyan-400/25 to-transparent"
          />
        </>
      )}

      {/* Scene 2: EPIC SWING Logo Reveal */}
      {sceneNum === 2 && (
        <div
          ref={logoWrapRef}
          className="relative flex flex-col items-center justify-center px-6"
        >
          <div
            ref={ringSweepRef}
            aria-hidden="true"
            className="pointer-events-none absolute h-56 w-56 rounded-full border-2 border-cyan-400/75"
          />
          <EpicSwingLogo variant="cinematic" />
        </div>
      )}

      {/* Scene 3: 3D Table Reveal Caption */}
      {sceneNum === 3 && (
        <div className="pointer-events-none fixed bottom-10 inset-x-0 flex justify-center px-4">
          <div className="rounded-xl border border-white/15 bg-[#070B14]/88 px-5 py-2.5 text-center shadow-2xl">
            <div className="text-[11px] font-bold uppercase tracking-[0.26em] text-cyan-400">
              Precision 3D Arena
            </div>
            <div className="mt-0.5 font-display text-sm sm:text-base font-bold text-white">
              Custom Strikers · Dynamic Lighting · 240Hz Physics
            </div>
          </div>
        </div>
      )}

      {/* Scene 4: Gameplay Cinematic Scoreboard + Goal + Logo Lockup */}
      {sceneNum === 4 && (
        <div className="pointer-events-none fixed inset-0 flex flex-col items-center justify-between py-6 px-4">
          <div className="flex items-center gap-4 rounded-xl border border-white/15 bg-[#070B14]/92 px-5 py-2 shadow-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Player 1
            </span>
            <span className="font-mono-tabular text-2xl font-extrabold text-white">
              {showGoalBanner ? 1 : 0}
            </span>
            <span className="text-slate-500 font-bold">:</span>
            <span className="font-mono-tabular text-2xl font-extrabold text-white">
              0
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
              Rival
            </span>
          </div>

          {showGoalBanner && (
            <div className="animate-goal-in flex flex-col items-center gap-4">
              <div className="rounded-2xl border-2 border-cyan-400 bg-[#070B14]/95 px-8 py-4 text-center shadow-2xl">
                <div className="font-display text-4xl sm:text-5xl font-extrabold text-cyan-300">
                  GOAL!
                </div>
                <div className="mt-1 text-xs font-bold uppercase tracking-widest text-orange-400">
                  108 km/h Top Corner Strike
                </div>
              </div>
              <EpicSwingLogo variant="hero" />
            </div>
          )}

          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-300">
            Cinematic Match Preview
          </div>
        </div>
      )}
    </div>
  );
};
