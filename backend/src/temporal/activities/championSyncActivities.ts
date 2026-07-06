import { SmtSyncStatus, UtilityType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { createLogger } from '../../lib/logger';
import { createPortalClient } from '../../services/championEnergy/portalClient';
import { invoicesToMonthlyBills } from '../../services/championEnergy/transform';
import { getChampionConfig, isChampionConfigured } from '../../services/championEnergy/types';

const log = createLogger('champion-activities');

function requireChampionConfig() {
  const config = getChampionConfig();
  if (!config) {
    throw new Error('Champion Energy not configured');
  }
  return config;
}

export async function checkChampionConfigured(): Promise<boolean> {
  return isChampionConfigured();
}

export async function syncElectricityBillCosts(): Promise<number> {
  const config = requireChampionConfig();
  const client = createPortalClient(config);
  const snapshot = await client.fetchBillingSnapshot();
  const monthlyBills = invoicesToMonthlyBills(snapshot.invoices);

  let recordsCount = 0;

  for (const bill of monthlyBills) {
    const existing = await prisma.utilityReading.findUnique({
      where: {
        utilityType_month: {
          utilityType: UtilityType.electricity,
          month: bill.month,
        },
      },
    });

    if (existing) {
      await prisma.utilityReading.update({
        where: {
          utilityType_month: {
            utilityType: UtilityType.electricity,
            month: bill.month,
          },
        },
        data: {
          cost: bill.amount,
        },
      });
    } else {
      await prisma.utilityReading.create({
        data: {
          utilityType: UtilityType.electricity,
          month: bill.month,
          consumption: 0,
          cost: bill.amount,
        },
      });
    }

    recordsCount += 1;
  }

  log.debug('Champion electricity bill costs stored', {
    invoiceCount: snapshot.invoices.length,
    monthlyCount: monthlyBills.length,
    recordsCount,
  });

  return recordsCount;
}

export async function logChampionSyncResult(
  status: SmtSyncStatus,
  recordsCount: number,
  error?: string
): Promise<void> {
  await prisma.championSyncLog.create({
    data: {
      status,
      recordsCount,
      error,
    },
  });

  if (status === SmtSyncStatus.success) {
    log.info('Champion sync completed', { recordsCount });
  } else if (status === SmtSyncStatus.error) {
    log.error('Champion sync failed', { recordsCount, error });
  }
}
