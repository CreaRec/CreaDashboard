import { Router } from 'express';
import { subscribeDashboardEvents } from '../lib/realtime';

const router = Router();

const HEARTBEAT_MS = 30_000;

router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event: string, data: Record<string, unknown> = {}) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const unsubscribe = subscribeDashboardEvents(() => {
    sendEvent('dashboard.updated', { at: new Date().toISOString() });
  });

  const heartbeat = setInterval(() => {
    sendEvent('heartbeat');
  }, HEARTBEAT_MS);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

export default router;
