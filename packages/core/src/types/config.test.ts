/**
 * Configuration Schema & Loading Tests
 *
 * Unit tests for config loading, validation, and environment variable interpolation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createContext, resetContext } from '../context';
import {
  loadConfig,
  findConfigFile,
  validateConfig,
  getDefaultConfig,
  interpolateEnvVars,
} from '../files/loader';
import type { TokensConfig } from './config';

describe('Config Schema & Loading', () => {
  const testRoot = '/test/project';

  beforeEach(() => {
    resetContext();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should load tokensrc.json with full schema', () => {
    const fullConfig: TokensConfig = {
      version: '2.0.0',
      figma: {
        fileId: 'abc123',
        nodeId: 'node456',
        accessToken: 'token789',
      },
      paths: {
        root: testRoot,
        data: '.figma/data',
        baseline: '.figma/data/baseline.json',
        baselinePrev: '.figma/data/baseline.prev.json',
        reports: '.figma/reports',
        tokens: 'tokens',
        styles: 'styles/tokens',
      },
      collections: {
        'core': {
          strategy: 'byMode',
          output: 'tokens/core',
          files: {
            'light': 'tokens/core/light.json',
            'dark': 'tokens/core/dark.json',
          },
        },
      },
      build: {
        command: 'npm run tokens:build',
        styleDictionary: {
          enabled: true,
          config: 'scripts/build-tokens.js',
        },
      },
      migration: {
        enabled: true,
        platforms: ['css', 'scss', 'js', 'ts'],
        exclude: ['node_modules/**', 'dist/**'],
      },
    };

    // Mock fs.existsSync and fs.readFileSync
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(fullConfig));

    const ctx = createContext({ rootDir: testRoot });
    const config = loadConfig(undefined, ctx);

    expect(config).toBeDefined();
    expect(config?.version).toBe('2.0.0');
    expect(config?.figma.fileId).toBe('abc123');
    // Paths are resolved to absolute - check that they end with the expected relative path
    expect(config?.paths.data).toBe(path.resolve(testRoot, '.figma/data'));
    expect(config?.collections.core.strategy).toBe('byMode');
    expect(config?.build?.command).toBe('npm run tokens:build');
    expect(config?.migration?.enabled).toBe(true);
  });

  it('should load with minimal config (only required fields)', () => {
    const minimalConfig: Partial<TokensConfig> = {
      version: '2.0.0',
      figma: {
        fileId: 'abc123',
        accessToken: 'token789',
      },
      paths: {
        root: testRoot,
        data: '.figma',
        baseline: '.figma/baseline.json',
        baselinePrev: '.figma/baseline.prev.json',
        reports: '.figma/reports',
        tokens: 'tokens',
        styles: 'styles',
      },
      collections: {},
    };

    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(minimalConfig));

    const ctx = createContext({ rootDir: testRoot });
    const config = loadConfig(undefined, ctx);

    expect(config).toBeDefined();
    expect(config?.figma.fileId).toBe('abc123');
    expect(config?.build).toBeUndefined();
    expect(config?.migration).toBeUndefined();
  });

  it('should use defaults when config file not found', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    const ctx = createContext({ rootDir: testRoot });
    const config = getDefaultConfig(ctx);

    expect(config).toBeDefined();
    expect(config.version).toBe('2.0.0');
    expect(config.paths.data).toBe('.figma');
    expect(config.paths.tokens).toBe('tokens');
    expect(config.paths.styles).toBe('styles/tokens');
    expect(config.figma.fileId).toBe('');
    expect(config.figma.accessToken).toBe('');
  });

  it('should find config file by checking multiple names', () => {
    // Test finding tokensrc.json (first priority)
    vi.spyOn(fs, 'existsSync').mockImplementation((filePath: any) => {
      return filePath.toString().endsWith('tokensrc.json');
    });

    let foundPath = findConfigFile(testRoot);
    expect(foundPath).toContain('tokensrc.json');

    // Test finding .synkiorc (second priority)
    vi.spyOn(fs, 'existsSync').mockImplementation((filePath: any) => {
      return filePath.toString().endsWith('.synkiorc');
    });

    foundPath = findConfigFile(testRoot);
    expect(foundPath).toContain('.synkiorc');

    // Test finding synkio.config.json (third priority)
    vi.spyOn(fs, 'existsSync').mockImplementation((filePath: any) => {
      return filePath.toString().endsWith('synkio.config.json');
    });

    foundPath = findConfigFile(testRoot);
    expect(foundPath).toContain('synkio.config.json');

    // Test none found
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    foundPath = findConfigFile(testRoot);
    expect(foundPath).toBeNull();
  });

  it('should interpolate environment variables', () => {
    const configWithEnv: TokensConfig = {
      version: '2.0.0',
      figma: {
        fileId: 'abc123',
        accessToken: '${FIGMA_ACCESS_TOKEN}',
      },
      paths: {
        root: testRoot,
        data: '${DATA_DIR}',
        baseline: '.figma/baseline.json',
        baselinePrev: '.figma/baseline.prev.json',
        reports: '.figma/reports',
        tokens: 'tokens',
        styles: 'styles',
      },
      collections: {},
    };

    // Set environment variables
    process.env.FIGMA_ACCESS_TOKEN = 'my-secret-token';
    process.env.DATA_DIR = 'custom-data';

    const interpolated = interpolateEnvVars(configWithEnv);

    expect(interpolated.figma.accessToken).toBe('my-secret-token');
    expect(interpolated.paths.data).toBe('custom-data');

    // Cleanup
    delete process.env.FIGMA_ACCESS_TOKEN;
    delete process.env.DATA_DIR;
  });

  it('should resolve relative paths from config directory', () => {
    const configDir = '/test/project';
    const config: TokensConfig = {
      version: '2.0.0',
      figma: {
        fileId: 'abc123',
        accessToken: 'token',
      },
      paths: {
        root: configDir,
        data: '.figma',
        baseline: '.figma/baseline.json',
        baselinePrev: '.figma/baseline.prev.json',
        reports: '.figma/reports',
        tokens: 'tokens',
        styles: 'styles',
      },
      collections: {},
    };

    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));

    const ctx = createContext({ rootDir: configDir });
    const loaded = loadConfig(undefined, ctx);

    expect(loaded).toBeDefined();
    // Paths should be resolved to absolute paths
    expect(loaded?.paths.data).toBe(path.resolve(configDir, '.figma'));
    expect(loaded?.paths.tokens).toBe(path.resolve(configDir, 'tokens'));
  });

  it('should provide helpful validation errors', () => {
    const invalidConfig = {
      version: '2.0.0',
      // Missing figma.fileId
      figma: {
        accessToken: 'token',
      },
      paths: {
        root: testRoot,
        data: '.figma',
        baseline: '.figma/baseline.json',
        baselinePrev: '.figma/baseline.prev.json',
        reports: '.figma/reports',
        tokens: 'tokens',
        styles: 'styles',
      },
      collections: {},
    };

    const errors = validateConfig(invalidConfig as any);

    expect(errors).toBeDefined();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('figma.fileId');
    expect(errors[0]).toContain('required');
  });
});
