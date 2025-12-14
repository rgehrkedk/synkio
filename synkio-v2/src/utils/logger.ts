/**
 * Logger interface for structured, testable logging
 * Supports metadata for debugging and future monitoring integration
 */
export interface Logger {
  debug(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
}

/**
 * Production logger that outputs to console
 * - debug() only logs when DEBUG environment variable is set
 * - Supports optional silent mode for programmatic usage
 */
export class ConsoleLogger implements Logger {
  private silent: boolean;

  constructor(options: { silent?: boolean } = {}) {
    this.silent = options.silent ?? false;
  }

  debug(message: string, meta?: Record<string, any>): void {
    if (!this.silent && process.env.DEBUG) {
      console.log(`[DEBUG] ${message}`, meta ? JSON.stringify(meta) : '');
    }
  }

  info(message: string, meta?: Record<string, any>): void {
    if (!this.silent) {
      console.log(message, meta ? JSON.stringify(meta, null, 2) : '');
    }
  }

  warn(message: string, meta?: Record<string, any>): void {
    if (!this.silent) {
      console.warn(`⚠️  ${message}`, meta ? JSON.stringify(meta) : '');
    }
  }

  error(message: string, meta?: Record<string, any>): void {
    // Always show errors, even in silent mode
    console.error(`❌ ${message}`, meta ? JSON.stringify(meta) : '');
  }
}

/**
 * Test logger that suppresses all output
 * Use in test contexts to avoid console pollution
 */
export class SilentLogger implements Logger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

/**
 * Factory function to create appropriate logger
 */
export function createLogger(options: { silent?: boolean } = {}): Logger {
  return options.silent ? new SilentLogger() : new ConsoleLogger(options);
}
