import { createLogger } from '../../lib/logger';

const log = createLogger('smt-odr-rate-limit');
const ODR_MIN_INTERVAL_MS = 60 * 60 * 1000;

let lastOdrSyncAt = 0;

export function canRunOdrSync(now = Date.now()): boolean {
  if (lastOdrSyncAt === 0) {
    log.debug('ODR sync allowed: no previous sync');
    return true;
  }

  const allowed = now - lastOdrSyncAt >= ODR_MIN_INTERVAL_MS;
  log.debug('ODR sync rate-limit check', {
    allowed,
    minutesSinceLastSync: Math.floor((now - lastOdrSyncAt) / 60_000),
  });
  return allowed;
}

export function markOdrSync(now = Date.now()): void {
  lastOdrSyncAt = now;
  log.debug('ODR sync marked', { at: new Date(now).toISOString() });
}

export function resetOdrSyncState(): void {
  lastOdrSyncAt = 0;
}

export function getLastOdrSyncAt(): number {
  return lastOdrSyncAt;
}
