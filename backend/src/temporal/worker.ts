import { NativeConnection, Worker } from '@temporalio/worker';
import { createLogger } from '../lib/logger';
import * as activities from './activities';
import { TEMPORAL_ADDRESS, TEMPORAL_NAMESPACE, TEMPORAL_TASK_QUEUE } from './config';
import { ensureSmtSyncSchedule } from './schedules';
import { getTemporalClient } from './client';

const log = createLogger('temporal-worker');

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWithRetry(delayMs = 2000): Promise<NativeConnection> {
  let attempt = 0;

  while (true) {
    attempt += 1;
    try {
      log.debug('Connecting to Temporal', { address: TEMPORAL_ADDRESS, attempt });
      return await NativeConnection.connect({ address: TEMPORAL_ADDRESS });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.warn('Temporal is not ready yet, retrying...', { attempt, error: message });
      await sleep(delayMs);
    }
  }
}

async function runWorker(): Promise<void> {
  log.info('Temporal worker starting', { address: TEMPORAL_ADDRESS });

  const connection = await connectWithRetry();

  const worker = await Worker.create({
    connection,
    namespace: TEMPORAL_NAMESPACE,
    taskQueue: TEMPORAL_TASK_QUEUE,
    workflowsPath: require.resolve('./workflows'),
    activities,
  });

  const client = await getTemporalClient();
  await ensureSmtSyncSchedule(client);

  log.info('Temporal worker started', {
    address: TEMPORAL_ADDRESS,
    namespace: TEMPORAL_NAMESPACE,
    taskQueue: TEMPORAL_TASK_QUEUE,
  });

  await worker.run();
}

async function shutdown(signal: string): Promise<void> {
  log.info('Shutting down Temporal worker', { signal });
  await getTemporalClient().then((client) => client.connection.close()).catch(() => undefined);
  process.exit(0);
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

runWorker().catch((error) => {
  log.error('Temporal worker failed', error);
  process.exit(1);
});
