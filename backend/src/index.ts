import express from 'express';
import cors from 'cors';
import utilitiesRouter from './routes/utilities';
import calendarRouter from './routes/calendar';
import remindersRouter from './routes/reminders';
import notesRouter from './routes/notes';
import layoutRouter from './routes/layout';
import { prisma } from './lib/prisma';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/utilities', utilitiesRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/notes', notesRouter);
app.use('/api/layout', layoutRouter);

const server = app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
