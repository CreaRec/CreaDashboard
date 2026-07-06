import { Client, Connection, ScheduleOverlapPolicy } from '@temporalio/client';
import { createLogger } from '../lib/logger';
import { getSmtConfig } from '../services/smartMeterTexas/types';
import { getWaterSmartConfig } from '../services/waterSmart/types';
import {
  SMT_SYNC_SCHEDULED_WORKFLOW_ID,
  SMT_SYNC_SCHEDULE_ID,
  SMT_SYNC_WORKFLOW,
  TEMPORAL_ADDRESS,
  TEMPORAL_NAMESPACE,
  TEMPORAL_TASK_QUEUE,
  WATER_SYNC_SCHEDULED_WORKFLOW_ID,
  WATER_SYNC_SCHEDULE_ID,
  WATER_SYNC_WORKFLOW,
} from './config';

const log = createLogger('temporal-schedule');

function isScheduleAlreadyExists(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === 'ScheduleAlreadyRunning' ||
    error.message.includes('already exists') ||
    error.message.includes('AlreadyExists')
  );
}

export async function ensureSmtSyncSchedule(client?: Client): Promise<void> {
  const config = getSmtConfig();
  if (!config) {
    log.debug('SMT sync schedule not created: not configured');
    return;
  }

  const intervalMinutes = Math.max(config.syncIntervalMinutes, 1);
  const temporalClient =
    client ??
    new Client({
      connection: await Connection.connect({ address: TEMPORAL_ADDRESS }),
      namespace: TEMPORAL_NAMESPACE,
    });

  const scheduleSpec = {
    scheduleId: SMT_SYNC_SCHEDULE_ID,
    spec: {
      intervals: [{ every: `${intervalMinutes} minutes` as `${number} minutes` }],
    },
    action: {
      type: 'startWorkflow' as const,
      workflowType: SMT_SYNC_WORKFLOW,
      taskQueue: TEMPORAL_TASK_QUEUE,
      args: [{}],
      workflowId: SMT_SYNC_SCHEDULED_WORKFLOW_ID,
    },
    policies: {
      overlap: ScheduleOverlapPolicy.SKIP,
      catchupWindow: '1 day' as const,
    },
  };

  try {
    await temporalClient.schedule.create(scheduleSpec);
    log.info('SMT sync schedule created', { intervalMinutes });
  } catch (error) {
    if (!isScheduleAlreadyExists(error)) {
      throw error;
    }

    const handle = temporalClient.schedule.getHandle(SMT_SYNC_SCHEDULE_ID);
    await handle.update((previous) => ({
      ...previous,
      spec: scheduleSpec.spec,
      action: scheduleSpec.action,
      policies: scheduleSpec.policies,
    }));
    log.info('SMT sync schedule updated', { intervalMinutes });
  }
}

export async function ensureWaterSyncSchedule(client?: Client): Promise<void> {
  const config = getWaterSmartConfig();
  if (!config) {
    log.debug('WaterSmart sync schedule not created: not configured');
    return;
  }

  const intervalMinutes = Math.max(config.syncIntervalMinutes, 1);
  const temporalClient =
    client ??
    new Client({
      connection: await Connection.connect({ address: TEMPORAL_ADDRESS }),
      namespace: TEMPORAL_NAMESPACE,
    });

  const scheduleSpec = {
    scheduleId: WATER_SYNC_SCHEDULE_ID,
    spec: {
      intervals: [{ every: `${intervalMinutes} minutes` as `${number} minutes` }],
    },
    action: {
      type: 'startWorkflow' as const,
      workflowType: WATER_SYNC_WORKFLOW,
      taskQueue: TEMPORAL_TASK_QUEUE,
      args: [],
      workflowId: WATER_SYNC_SCHEDULED_WORKFLOW_ID,
    },
    policies: {
      overlap: ScheduleOverlapPolicy.SKIP,
      catchupWindow: '1 day' as const,
    },
  };

  try {
    await temporalClient.schedule.create(scheduleSpec);
    log.info('WaterSmart sync schedule created', { intervalMinutes });
  } catch (error) {
    if (!isScheduleAlreadyExists(error)) {
      throw error;
    }

    const handle = temporalClient.schedule.getHandle(WATER_SYNC_SCHEDULE_ID);
    await handle.update((previous) => ({
      ...previous,
      spec: scheduleSpec.spec,
      action: scheduleSpec.action,
      policies: scheduleSpec.policies,
    }));
    log.info('WaterSmart sync schedule updated', { intervalMinutes });
  }
}
