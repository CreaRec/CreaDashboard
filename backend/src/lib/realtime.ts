import { prisma } from './prisma';
import { createLogger } from './logger';

const log = createLogger('realtime');

type DashboardEventListener = () => void;

const listeners = new Set<DashboardEventListener>();

let lastSeenSmtSyncedAt: Date | null = null;
let lastSeenWaterSyncedAt: Date | null = null;
let lastSeenGasSyncedAt: Date | null = null;
let lastSeenChampionSyncedAt: Date | null = null;
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
      const [latestSmt, latestWater, latestGas, latestChampion] = await Promise.all([
        prisma.smtSyncLog.findFirst({
          orderBy: { syncedAt: 'desc' },
          select: { syncedAt: true },
        }),
        prisma.waterSyncLog.findFirst({
          orderBy: { syncedAt: 'desc' },
          select: { syncedAt: true },
        }),
        prisma.gasSyncLog.findFirst({
          orderBy: { syncedAt: 'desc' },
          select: { syncedAt: true },
        }),
        prisma.championSyncLog.findFirst({
          orderBy: { syncedAt: 'desc' },
          select: { syncedAt: true },
        }),
      ]);

      let shouldBroadcast = false;

      if (
        latestSmt &&
        lastSeenSmtSyncedAt !== null &&
        latestSmt.syncedAt.getTime() !== lastSeenSmtSyncedAt.getTime()
      ) {
        shouldBroadcast = true;
      }

      if (
        latestWater &&
        lastSeenWaterSyncedAt !== null &&
        latestWater.syncedAt.getTime() !== lastSeenWaterSyncedAt.getTime()
      ) {
        shouldBroadcast = true;
      }

      if (
        latestGas &&
        lastSeenGasSyncedAt !== null &&
        latestGas.syncedAt.getTime() !== lastSeenGasSyncedAt.getTime()
      ) {
        shouldBroadcast = true;
      }

      if (
        latestChampion &&
        lastSeenChampionSyncedAt !== null &&
        latestChampion.syncedAt.getTime() !== lastSeenChampionSyncedAt.getTime()
      ) {
        shouldBroadcast = true;
      }

      if (shouldBroadcast) {
        log.debug('New utility sync detected, broadcasting dashboard update');
        broadcastDashboardUpdate();
      }

      if (latestSmt) {
        lastSeenSmtSyncedAt = latestSmt.syncedAt;
      }
      if (latestWater) {
        lastSeenWaterSyncedAt = latestWater.syncedAt;
      }
      if (latestGas) {
        lastSeenGasSyncedAt = latestGas.syncedAt;
      }
      if (latestChampion) {
        lastSeenChampionSyncedAt = latestChampion.syncedAt;
      }
    } catch (error) {
      log.error('Sync watcher failed', error);
    }
  }, pollMs);
}
