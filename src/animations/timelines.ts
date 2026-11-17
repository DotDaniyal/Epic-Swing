import gsap from 'gsap';

export const INTRO_TIMINGS_MS = {
  LOGO_REVEAL: 1800,
  TABLE_REVEAL: 4300,
  GAMEPLAY_RALLY: 7400,
  FALLBACK_GOAL_BANNER: 9900,
  MENU_BLEND: 11400,
  COMPLETE: 12500,
} as const;

export function animatePanelEnter(
  el: HTMLElement | null,
  reducedMotion: boolean
): void {
  if (!el || reducedMotion) return;
  gsap.fromTo(
    el,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }
  );
}

export function animateResultsCardAndCoins(
  cardEl: HTMLElement | null,
  targetCoins: number,
  reducedMotion: boolean,
  onCoinUpdate: (val: number) => void
): gsap.core.Tween | null {
  if (!cardEl || reducedMotion) {
    onCoinUpdate(targetCoins);
    return null;
  }

  gsap.fromTo(
    cardEl,
    { opacity: 0, scale: 0.92, y: 18 },
    { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: 'back.out(1.4)' }
  );

  const counter = { val: 0 };
  return gsap.to(counter, {
    val: targetCoins,
    duration: 0.9,
    delay: 0.25,
    ease: 'power2.out',
    onUpdate: () => onCoinUpdate(Math.round(counter.val)),
  });
}

export function animateIntroScene1Particles(
  particlesEl: HTMLElement | null,
  sweepEl: HTMLElement | null
): void {
  if (particlesEl) {
    Array.from(particlesEl.children).forEach((el, idx) => {
      gsap.fromTo(
        el,
        { opacity: 0, scale: 0.4, y: 12 },
        {
          opacity: 0.9,
          scale: 1,
          y: -26 - (idx % 4) * 8,
          duration: 1.6,
          delay: (idx % 6) * 0.12,
          ease: 'power1.out',
        }
      );
    });
  }

  if (sweepEl) {
    gsap.fromTo(
      sweepEl,
      { xPercent: -120, opacity: 0 },
      {
        xPercent: 130,
        opacity: 0.95,
        duration: 1.4,
        delay: 0.25,
        ease: 'power2.inOut',
      }
    );
  }
}

export function animateIntroScene2Logo(
  logoEl: HTMLElement | null,
  ringEl: HTMLElement | null
): void {
  if (logoEl) {
    gsap.fromTo(
      logoEl,
      { opacity: 0, scale: 1.24, y: 18 },
      { opacity: 1, scale: 1, y: 0, duration: 0.85, ease: 'power3.out' }
    );
  }
  if (ringEl) {
    gsap.fromTo(
      ringEl,
      { scale: 0.5, opacity: 0.9, rotation: -40 },
      { scale: 1.7, opacity: 0, rotation: 90, duration: 1.35, ease: 'power2.out' }
    );
  }
}

export function animateCoinBurst(
  wrapEl: HTMLElement,
  particlesEl: HTMLElement | null,
  onComplete?: () => void
): gsap.core.Timeline {
  const tl = gsap.timeline({ onComplete });

  tl.fromTo(
    wrapEl,
    { opacity: 0, scale: 0.85, y: 16 },
    { opacity: 1, scale: 1, y: 0, duration: 0.32, ease: 'back.out(1.6)' }
  );

  if (particlesEl) {
    const dots = Array.from(particlesEl.children);
    dots.forEach((dot, idx) => {
      const angle = (idx / dots.length) * Math.PI * 2;
      const dist = 54 + (idx % 3) * 18;
      gsap.fromTo(
        dot,
        { x: 0, y: 0, scale: 0.4, opacity: 1 },
        {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          scale: 1.15,
          opacity: 0,
          duration: 0.72,
          ease: 'power2.out',
        }
      );
    });
  }

  tl.to(wrapEl, {
    opacity: 0,
    y: -12,
    duration: 0.28,
    delay: 1.1,
    ease: 'power2.in',
  });

  return tl;
}
