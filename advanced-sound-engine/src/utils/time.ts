/**
 * Get current server time (for sync calculations)
 */
export function getServerTime(): number {
  // Foundry's game.time.serverTime учитывает offset
  return Date.now();
}

/**
 * Calculate playback offset based on start time
 */
export function calculateOffset(startedAt: number, pausedAt: number = 0): number {
  if (pausedAt > 0) {
    return pausedAt;
  }
  return (getServerTime() - startedAt) / 1000;
}

/**
 * Format seconds to mm:ss
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}