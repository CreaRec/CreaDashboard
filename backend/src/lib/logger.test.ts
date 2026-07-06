import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger, getPrismaLogLevels, resolveLogLevel } from './logger';

describe('logger', () => {
  const originalLogLevel = process.env.LOG_LEVEL;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalLogLevel === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalLogLevel;
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }

    vi.restoreAllMocks();
  });

  it('defaults to debug outside production', () => {
    delete process.env.LOG_LEVEL;
    delete process.env.NODE_ENV;

    expect(resolveLogLevel()).toBe('debug');
  });

  it('defaults to info in production', () => {
    delete process.env.LOG_LEVEL;
    process.env.NODE_ENV = 'production';

    expect(resolveLogLevel()).toBe('info');
  });

  it('respects LOG_LEVEL env var', () => {
    process.env.LOG_LEVEL = 'warn';

    expect(resolveLogLevel()).toBe('warn');
  });

  it('filters messages below the configured level', () => {
    process.env.LOG_LEVEL = 'warn';
    const log = createLogger('test');

    log.debug('hidden debug');
    log.info('hidden info');
    log.warn('visible warn');
    log.error('visible error');

    expect(console.log).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledOnce();
    expect(console.error).toHaveBeenCalledOnce();
  });

  it('includes query logging for prisma at debug level', () => {
    process.env.LOG_LEVEL = 'debug';

    expect(getPrismaLogLevels()).toEqual(['query', 'warn', 'error']);
  });

  it('omits query logging for prisma above debug level', () => {
    process.env.LOG_LEVEL = 'info';

    expect(getPrismaLogLevels()).toEqual(['warn', 'error']);
  });
});
