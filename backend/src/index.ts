import express from 'express';
import cors from 'cors';
import utilitiesRouter from './routes/utilities';
import electricityRouter from './routes/electricity';
import calendarRouter from './routes/calendar';
import remindersRouter from './routes/reminders';
import notesRouter from './routes/notes';
import layoutRouter from './routes/layout';
import smtIntegrationRouter from './routes/integrations/smt';
import { prisma } from './lib/prisma';
import { createLogger, resolveLogLevel } from './lib/logger';
import { startSmtSyncScheduler } from './services/smartMeterTexas/sync';

const log = createLogger('server');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    log.debug(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startedAt}ms)`);
  });

  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/utilities', utilitiesRouter);
app.use('/api/electricity', electricityRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/notes', notesRouter);
app.use('/api/layout', layoutRouter);
app.use('/api/integrations/smt', smtIntegrationRouter);

const server = app.listen(PORT, () => {
  log.info(`Backend running on http://localhost:${PORT} (log level: ${resolveLogLevel()})`);
  startSmtSyncScheduler();
});

async function shutdown() {
  log.info('Shutting down...');
  server.close(async () => {
    await prisma.$disconnect();
    log.debug('Database connection closed');
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
