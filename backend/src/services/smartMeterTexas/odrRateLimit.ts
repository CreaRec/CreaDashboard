import { prisma } from '../../lib/prisma';
import { createLogger } from '../../lib/logger';

const log = createLogger('smt-odr-rate-limit');
export const ODR_MIN_INTERVAL_MS = 60 * 60 * 1000;

export async function canRunOdrSync(esiid: string, now = Date.now()): Promise<boolean> {
  const snapshot = await prisma.electricityMeterSnapshot.findUnique({
    where: { esiid },
  });

  if (!snapshot?.readAt) {
    log.debug('ODR sync allowed: no previous snapshot', { esiid });
    return true;
  }

  const minutesSinceLastSync = Math.floor((now - snapshot.readAt.getTime()) / 60_000);
  const allowed = now - snapshot.readAt.getTime() >= ODR_MIN_INTERVAL_MS;
  log.debug('ODR sync rate-limit check', {
    esiid,
    allowed,
    minutesSinceLastSync,
  });
  return allowed;
}
