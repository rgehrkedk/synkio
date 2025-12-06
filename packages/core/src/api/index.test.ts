/**
 * Programmatic API Tests
 *
 * Tests for the public API exports
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from './index.js';

describe('Programmatic API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export init function', () => {
    expect(api.init).toBeDefined();
    expect(typeof api.init).toBe('function');
  });

  it('should export getContext function', () => {
    expect(api.getContext).toBeDefined();
    expect(typeof api.getContext).toBe('function');
  });

  it('should export createContext function', () => {
    expect(api.createContext).toBeDefined();
    expect(typeof api.createContext).toBe('function');
  });

  it('should initialize context with init()', () => {
    api.init({ rootDir: '/test/project' });

    const ctx = api.getContext();
    expect(ctx).toBeDefined();
    expect(ctx.rootDir).toBe('/test/project');
  });

  it('should create independent context instances', () => {
    const ctx1 = api.createContext({ rootDir: '/project1' });
    const ctx2 = api.createContext({ rootDir: '/project2' });

    expect(ctx1).toBeDefined();
    expect(ctx2).toBeDefined();
    expect(ctx1.rootDir).toBe('/project1');
    expect(ctx2.rootDir).toBe('/project2');
    expect(ctx1).not.toBe(ctx2);
  });

  it('should export fetchFigmaData function', () => {
    expect(api.fetchFigmaData).toBeDefined();
    expect(typeof api.fetchFigmaData).toBe('function');
  });

  it('should export compareBaselines function', () => {
    expect(api.compareBaselines).toBeDefined();
    expect(typeof api.compareBaselines).toBe('function');
  });

  it('should export splitTokens function', () => {
    expect(api.splitTokens).toBeDefined();
    expect(typeof api.splitTokens).toBe('function');
  });

  it('should export file operation functions', () => {
    expect(api.loadConfig).toBeDefined();
    expect(api.loadConfigOrThrow).toBeDefined();
    expect(api.saveConfig).toBeDefined();
    expect(api.loadBaseline).toBeDefined();
    expect(api.backupBaseline).toBeDefined();
    expect(api.restoreBaseline).toBeDefined();
    expect(api.saveJsonFile).toBeDefined();
    expect(api.saveTextFile).toBeDefined();
  });

  it('should export environment functions', () => {
    expect(api.loadEnv).toBeDefined();
    expect(api.getFigmaToken).toBeDefined();
  });

  it('should export comparison helper functions', () => {
    expect(api.hasChanges).toBeDefined();
    expect(api.hasBreakingChanges).toBeDefined();
    expect(api.getChangeCounts).toBeDefined();
    expect(api.generateDiffReport).toBeDefined();
    expect(api.printDiffSummary).toBeDefined();
  });
});
