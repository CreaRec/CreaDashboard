import { describe, expect, it } from 'vitest';
import http from 'node:http';
import express from 'express';
import eventsRouter from './events';
import { broadcastDashboardUpdate } from '../lib/realtime';

function createApp() {
  const app = express();
  app.use('/api/events', eventsRouter);
  return app;
}

describe('GET /api/events', () => {
  it('streams dashboard.updated events', async () => {
    const app = createApp();
    const server = await new Promise<http.Server>((resolve) => {
      const listeningServer = app.listen(0, () => resolve(listeningServer));
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to bind test server');
    }

    const body = await new Promise<string>((resolve, reject) => {
      const request = http.get(
        `http://127.0.0.1:${address.port}/api/events`,
        (response) => {
          let chunks = '';
          response.on('data', (chunk: string) => {
            chunks += chunk;
            if (chunks.includes('event: dashboard.updated') && chunks.includes('data:')) {
              request.destroy();
              resolve(chunks);
            }
          });
          response.on('end', () => resolve(chunks));
          response.on('error', reject);
        }
      );

      request.on('error', reject);
      setTimeout(() => broadcastDashboardUpdate(), 50);
    });

    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });

    expect(body).toContain('event: dashboard.updated');
    expect(body).toContain('"at"');
  });
});
