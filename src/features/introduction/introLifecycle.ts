export type IntroLifecyclePhase =
  | 'INITIALIZING'
  | 'INTRO_PLAYING'
  | 'INTRO_COMPLETED'
  | 'MAIN_MENU';

/**
 * Module-level singleton state that persists across React component remounts,
 * StrictMode re-renders, and screen navigation during the browser session.
 */
let sessionIntroPlayed = false;
let currentPhase: IntroLifecyclePhase = 'INITIALIZING';
const listeners = new Set<(phase: IntroLifecyclePhase) => void>();

export function getIntroLifecyclePhase(): IntroLifecyclePhase {
  return currentPhase;
}

export function hasSessionIntroPlayed(): boolean {
  return sessionIntroPlayed;
}

export function subscribeIntroLifecycle(
  callback: (phase: IntroLifecyclePhase) => void
): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function transitionIntroLifecycle(phase: IntroLifecyclePhase): void {
  if (currentPhase === phase) return;
  currentPhase = phase;
  if (phase === 'INTRO_COMPLETED' || phase === 'MAIN_MENU') {
    sessionIntroPlayed = true;
  }
  listeners.forEach((listener) => {
    try {
      listener(phase);
    } catch {
      // Ignore listener error
    }
  });
}

/**
 * Mark intro as completed and move immediately to MAIN_MENU.
 */
export function markIntroCompleted(): void {
  sessionIntroPlayed = true;
  transitionIntroLifecycle('INTRO_COMPLETED');
  transitionIntroLifecycle('MAIN_MENU');
}

/**
 * Explicit replay requested by the user from Settings.
 */
export function triggerManualIntroReplay(): void {
  transitionIntroLifecycle('INTRO_PLAYING');
}
