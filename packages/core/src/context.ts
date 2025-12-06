/**
 * Context System
 *
 * Provides context-based path resolution for framework-agnostic usage.
 * Supports both global singleton (convenience) and explicit instances (monorepo).
 *
 * @example Global singleton (convenience)
 * ```typescript
 * initContext({ rootDir: process.cwd() });
 * const path = getBaselinePath(); // uses global context
 * ```
 *
 * @example Explicit context (monorepo)
 * ```typescript
 * const ctx = createContext({ rootDir: './packages/app' });
 * const path = getBaselinePath(ctx);
 * ```
 */

import path from 'path';

// ============================================================================
// Context Interface
// ============================================================================

/**
 * Context holds all path configuration for a project.
 * All paths are resolved relative to rootDir.
 */
export interface Context {
  /** Project root directory (typically process.cwd()) */
  rootDir: string;
}

/**
 * Options for initializing a context
 */
export interface ContextOptions {
  /** Project root directory */
  rootDir: string;
}

// ============================================================================
// Global Singleton Context
// ============================================================================

let globalContext: Context | null = null;

/**
 * Initialize the global context.
 * This is the convenience API for single-project usage.
 *
 * @param options - Context options
 *
 * @example
 * ```typescript
 * initContext({ rootDir: process.cwd() });
 * ```
 */
export function initContext(options: ContextOptions): void {
  globalContext = createContext(options);
}

/**
 * Get the global context, auto-initializing if needed.
 * Auto-initialization uses process.cwd() as rootDir with zero other assumptions.
 *
 * @returns The global context instance
 *
 * @example
 * ```typescript
 * const ctx = getContext();
 * console.log(ctx.rootDir); // process.cwd()
 * ```
 */
export function getContext(): Context {
  if (!globalContext) {
    // Auto-initialize with only rootDir, no other assumptions
    globalContext = createContext({ rootDir: process.cwd() });
  }
  return globalContext;
}

/**
 * Reset the global context (useful for testing)
 * @internal
 */
export function resetContext(): void {
  globalContext = null;
}

// ============================================================================
// Explicit Context Instances
// ============================================================================

/**
 * Create an explicit context instance.
 * Use this for monorepo scenarios where multiple projects need separate contexts.
 *
 * @param options - Context options
 * @returns A new context instance
 *
 * @example Monorepo usage
 * ```typescript
 * const projectA = createContext({ rootDir: './apps/web' });
 * const projectB = createContext({ rootDir: './apps/mobile' });
 *
 * syncTokens(projectA);
 * syncTokens(projectB);
 * ```
 */
export function createContext(options: ContextOptions): Context {
  const { rootDir } = options;

  return {
    rootDir: path.resolve(rootDir),
  };
}

// ============================================================================
// Context Validation
// ============================================================================

/**
 * Validate that a context is properly initialized.
 * Throws actionable error if context is invalid.
 *
 * @param ctx - Context to validate
 * @throws Error if context is invalid
 * @internal
 */
export function validateContext(ctx: Context): void {
  if (!ctx.rootDir) {
    throw new Error(
      'Context not properly initialized: missing rootDir.\n' +
      "Run 'synkio init' or call initContext({ rootDir: process.cwd() }) programmatically."
    );
  }
}
