type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = process.env.NODE_ENV !== 'production';

function write(level: LogLevel, module: string, message: string, args: unknown[]): void {
  if (!isDev && level === 'debug') {
    return;
  }

  const prefix = `[${level.toUpperCase()}] [${module}]`;
  const writer =
    level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

  if (args.length > 0) {
    writer(prefix, message, ...args);
    return;
  }

  writer(prefix, message);
}

export function createLogger(module: string) {
  return {
    debug: (message: string, ...args: unknown[]) => write('debug', module, message, args),
    info: (message: string, ...args: unknown[]) => write('info', module, message, args),
    warn: (message: string, ...args: unknown[]) => write('warn', module, message, args),
    error: (message: string, ...args: unknown[]) => write('error', module, message, args),
  };
}
