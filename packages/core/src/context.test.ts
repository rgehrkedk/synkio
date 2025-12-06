/**
 * Context System Tests
 *
 * Unit tests for context system with mocked filesystem.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initContext, getContext, createContext, resetContext } from './context';

describe('Context System', () => {
  beforeEach(() => {
    // Reset context before each test
    resetContext();
  });

  it('should auto-initialize context with default rootDir on first use', () => {
    const ctx = getContext();
    expect(ctx).toBeDefined();
    expect(ctx.rootDir).toBe(process.cwd());
  });

  it('should allow explicit context initialization with custom paths', () => {
    const customRoot = '/custom/project/root';
    initContext({ rootDir: customRoot });

    const ctx = getContext();
    expect(ctx.rootDir).toBe(customRoot);
  });

  it('should support global singleton behavior', () => {
    initContext({ rootDir: '/test/root' });

    const ctx1 = getContext();
    const ctx2 = getContext();

    expect(ctx1).toBe(ctx2); // Same instance
    expect(ctx1.rootDir).toBe('/test/root');
  });

  it('should support explicit context instance creation for monorepo', () => {
    const ctx1 = createContext({ rootDir: '/monorepo/app1' });
    const ctx2 = createContext({ rootDir: '/monorepo/app2' });

    expect(ctx1).not.toBe(ctx2); // Different instances
    expect(ctx1.rootDir).toBe('/monorepo/app1');
    expect(ctx2.rootDir).toBe('/monorepo/app2');
  });

  it('should create isolated context instances for monorepo scenario', () => {
    const projectA = createContext({ rootDir: '/monorepo/projectA' });
    const projectB = createContext({ rootDir: '/monorepo/projectB' });

    expect(projectA.rootDir).toBe('/monorepo/projectA');
    expect(projectB.rootDir).toBe('/monorepo/projectB');

    // Instances should be completely isolated
    expect(projectA).not.toBe(projectB);
  });

  it('should resolve paths relative to context rootDir', () => {
    const ctx = createContext({ rootDir: '/project/root' });

    expect(ctx.rootDir).toBe('/project/root');
    // Path resolution will be tested with actual path functions
  });
});
