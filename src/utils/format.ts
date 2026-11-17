/**
 * Formats seconds into MM:SS digital clock readout.
 */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Formats match duration into compact human label (e.g. "3m", "2m 30s", "Unlimited").
 */
export function formatDurationLabel(
  durationSeconds: number,
  isPractice = false,
  practiceLabel = 'Unlimited'
): string {
  if (isPractice) return practiceLabel;
  const mins = Math.floor(durationSeconds / 60);
  const secs = durationSeconds % 60;
  return `${mins}m ${secs > 0 ? `${secs}s` : ''}`.trim();
}
