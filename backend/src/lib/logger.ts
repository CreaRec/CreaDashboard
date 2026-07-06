export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export function resolveLogLevel(): LogLevel {
  const configured = process.env.LOG_LEVEL?.toLowerCase();
  if (configured && configured in LOG_LEVEL_PRIORITY) {
    return configured as LogLevel;
  }

  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[resolveLogLevel()];
}

export type Logger = {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
};

function writeLog(level: LogLevel, module: string, message: string, args: unknown[]): void {
  if (!shouldLog(level)) {
    return;
  }

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${module}]`;
  const writer =
    level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

  if (args.length > 0) {
    writer(prefix, message, ...args);
    return;
  }

  writer(prefix, message);
}

export function createLogger(module: string): Logger {
  return {
    debug: (message, ...args) => writeLog('debug', module, message, args),
    info: (message, ...args) => writeLog('info', module, message, args),
    warn: (message, ...args) => writeLog('warn', module, message, args),
    error: (message, ...args) => writeLog('error', module, message, args),
  };
}

export const logger = createLogger('app');

export function getPrismaLogLevels(): Array<'query' | 'warn' | 'error'> {
  if (resolveLogLevel() === 'debug') {
    return ['query', 'warn', 'error'];
  }

  if (resolveLogLevel() === 'info') {
    return ['warn', 'error'];
  }

  return ['error'];
}
