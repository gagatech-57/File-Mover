import { config } from '../config/env.js';
import { sessionStore } from './sessionStore.js';

let cleanupInterval = null;

export function startCleanupTask() {
  if (cleanupInterval) return;

  const ms = config.CLEANUP_INTERVAL_SECONDS * 1000;
  console.log(`[CleanupService] Automatic session cleanup task initialized (interval: ${config.CLEANUP_INTERVAL_SECONDS}s).`);

  cleanupInterval = setInterval(() => {
    try {
      sessionStore.cleanupExpired();
    } catch (err) {
      console.error('[CleanupService] Error during automatic cleanup:', err);
    }
  }, ms);
}

export function stopCleanupTask() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
