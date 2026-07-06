import { Client, Connection } from '@temporalio/client';
import { createLogger } from '../lib/logger';
import { TEMPORAL_ADDRESS, TEMPORAL_NAMESPACE } from './config';

const log = createLogger('temporal-client');

let clientPromise: Promise<Client> | null = null;

export async function getTemporalClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = (async () => {
      log.debug('Connecting Temporal client', {
        address: TEMPORAL_ADDRESS,
        namespace: TEMPORAL_NAMESPACE,
      });
      const connection = await Connection.connect({ address: TEMPORAL_ADDRESS });
      return new Client({ connection, namespace: TEMPORAL_NAMESPACE });
    })();
  }

  return clientPromise;
}

export async function closeTemporalClient(): Promise<void> {
  if (!clientPromise) {
    return;
  }

  const client = await clientPromise;
  await client.connection.close();
  clientPromise = null;
}
