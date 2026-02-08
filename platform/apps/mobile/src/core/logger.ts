/* eslint-disable no-console */

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => console.log(`[mobile] ${message}`, meta ?? ''),
  warn: (message: string, meta?: Record<string, unknown>) => console.warn(`[mobile] ${message}`, meta ?? ''),
  error: (message: string, meta?: Record<string, unknown>) => console.error(`[mobile] ${message}`, meta ?? ''),
};
