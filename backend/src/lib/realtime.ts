import { prisma } from './prisma';
import { createLogger } from './logger';

const log = createLogger('realtime');

type DashboardEventListener = () => void;

const listeners = new Set<DashboardEventListener>();

let lastSeenSyncedAt: Date | null = null;
let syncWatcherStarted = false;

export function subscribeDashboardEvents(listener: DashboardEventListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function broadcastDashboardUpdate(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function startSyncWatcher(pollMs = 15_000): void {
  if (syncWatcherStarted) {
    return;
  }
  syncWatcherStarted = true;

  setInterval(async () => {
    try {
      const latest = await prisma.smtSyncLog.findFirst({
        orderBy: { syncedAt: 'desc' },
        select: { syncedAt: true },
      });

      if (!latest) {
        return;
      }

      if (
        lastSeenSyncedAt !== null &&
        latest.syncedAt.getTime() !== lastSeenSyncedAt.getTime()
      ) {
        log.debug('New SMT sync detected, broadcasting dashboard update');
        broadcastDashboardUpdate();
      }

      lastSeenSyncedAt = latest.syncedAt;
    } catch (error) {
      log.error('Sync watcher failed', error);
    }
  }, pollMs);
}
