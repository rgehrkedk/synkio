/**
 * Path Functions Tests
 *
 * Unit tests for context-based path resolution.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createContext, resetContext } from '../context';
import {
  getDataDir,
  getConfigPath,
  getBaselinePath,
  getBaselinePrevPath,
  getTokensDir,
  getStylesDir,
  getReportsDir,
  getDiffReportPath,
  getMigrationReportPath,
} from './paths';

describe('Path Functions', () => {
  beforeEach(() => {
    resetContext();
  });

  it('should return data dir from context', () => {
    const ctx = createContext({ rootDir: '/project' });
    const dataDir = getDataDir(ctx);

    expect(dataDir).toContain('/project');
    expect(dataDir).toContain('.figma');
  });

  it('should return config path from context', () => {
    const ctx = createContext({ rootDir: '/project' });
    const configPath = getConfigPath(ctx);

    expect(configPath).toContain('/project');
    expect(configPath).toContain('tokensrc.json');
  });

  it('should resolve baseline path correctly', () => {
    const ctx = createContext({ rootDir: '/project' });
    const baselinePath = getBaselinePath(ctx);

    expect(baselinePath).toContain('/project');
    expect(baselinePath).toContain('baseline.json');
  });

  it('should resolve tokens dir using context', () => {
    const ctx = createContext({ rootDir: '/my/project' });
    const tokensDir = getTokensDir(ctx);

    expect(tokensDir).toContain('/my/project');
    expect(tokensDir).toContain('tokens');
  });

  it('should accept optional Context parameter', () => {
    const ctx = createContext({ rootDir: '/custom/root' });

    // With explicit context
    const dataDir1 = getDataDir(ctx);
    expect(dataDir1).toContain('/custom/root');

    // Without context (uses global)
    const dataDir2 = getDataDir();
    expect(dataDir2).toBeDefined();
  });

  it('should work with different project structures', () => {
    const ctx1 = createContext({ rootDir: '/nextjs/app' });
    const ctx2 = createContext({ rootDir: '/remix/app' });

    const config1 = getConfigPath(ctx1);
    const config2 = getConfigPath(ctx2);

    expect(config1).toContain('/nextjs/app');
    expect(config2).toContain('/remix/app');
    expect(config1).not.toBe(config2);
  });

  it('should resolve all path functions without errors', () => {
    const ctx = createContext({ rootDir: '/test/project' });

    expect(() => getDataDir(ctx)).not.toThrow();
    expect(() => getConfigPath(ctx)).not.toThrow();
    expect(() => getBaselinePath(ctx)).not.toThrow();
    expect(() => getBaselinePrevPath(ctx)).not.toThrow();
    expect(() => getTokensDir(ctx)).not.toThrow();
    expect(() => getStylesDir(ctx)).not.toThrow();
    expect(() => getReportsDir(ctx)).not.toThrow();
    expect(() => getDiffReportPath(ctx)).not.toThrow();
    expect(() => getMigrationReportPath(ctx)).not.toThrow();
  });
});
