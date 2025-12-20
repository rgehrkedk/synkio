/**
 * Source Resolver Module Tests
 *
 * Tests for resolving import sources from CLI paths or config.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  resolveFromPath,
  resolveFromConfig,
  resolveImportSources,
} from './source-resolver.js';
import type { Config } from '../config.js';

// Test fixtures directory
const TEST_DIR = resolve(process.cwd(), '.test-import-sources');

// Sample Figma native format content
const sampleTokenContent = {
  colors: {
    primary: {
      $type: 'color',
      $value: { hex: '#007bff' },
      $extensions: {
        'com.figma.variableId': 'VariableID:1:1',
      },
    },
  },
  $extensions: {
    'com.figma.modeName': 'light',
  },
};

describe('source-resolver', () => {
  beforeAll(async () => {
    // Create test directories and files
    await mkdir(TEST_DIR, { recursive: true });
    await mkdir(resolve(TEST_DIR, 'theme'), { recursive: true });
    await mkdir(resolve(TEST_DIR, 'empty'), { recursive: true });

    // Create test JSON files
    await writeFile(
      resolve(TEST_DIR, 'single.tokens.json'),
      JSON.stringify(sampleTokenContent)
    );
    await writeFile(
      resolve(TEST_DIR, 'theme', 'light.json'),
      JSON.stringify(sampleTokenContent)
    );
    await writeFile(
      resolve(TEST_DIR, 'theme', 'dark.json'),
      JSON.stringify({ ...sampleTokenContent, $extensions: { 'com.figma.modeName': 'dark' } })
    );
  });

  afterAll(async () => {
    // Cleanup test directory
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('resolveFromPath', () => {
    it('should resolve a single JSON file', async () => {
      const result = await resolveFromPath(
        resolve(TEST_DIR, 'single.tokens.json'),
        'tokens'
      );

      expect(result.error).toBeUndefined();
      expect(result.files).toHaveLength(1);
      expect(result.files[0].filename).toBe('single.tokens.json');
      expect(result.files[0].collection).toBe('tokens');
      expect(result.files[0].content).toHaveProperty('colors');
    });

    it('should resolve all JSON files in a directory', async () => {
      const result = await resolveFromPath(
        resolve(TEST_DIR, 'theme'),
        'theme'
      );

      expect(result.error).toBeUndefined();
      expect(result.files).toHaveLength(2);
      expect(result.files.map(f => f.filename).sort()).toEqual(['dark.json', 'light.json']);
      expect(result.files.every(f => f.collection === 'theme')).toBe(true);
    });

    it('should return error for non-existent path', async () => {
      const result = await resolveFromPath(
        resolve(TEST_DIR, 'nonexistent.json'),
        'test'
      );

      expect(result.error).toContain('Path not found');
      expect(result.files).toHaveLength(0);
    });

    it('should return error for empty directory', async () => {
      const result = await resolveFromPath(
        resolve(TEST_DIR, 'empty'),
        'test'
      );

      expect(result.error).toContain('No JSON files found');
      expect(result.files).toHaveLength(0);
    });
  });

  describe('resolveFromConfig', () => {
    it('should resolve files from config import.sources', async () => {
      // Use Partial<Config> to avoid needing all required fields
      const config = {
        figma: { fileId: 'test', accessToken: 'test-token' },
        tokens: { dir: 'tokens', collections: {} },
        import: {
          dir: TEST_DIR,
          sources: {
            theme: {
              dir: resolve(TEST_DIR, 'theme'),
              files: ['light.json'],
            },
          },
        },
      } as Config;

      const result = await resolveFromConfig(config);

      expect(result.error).toBeUndefined();
      expect(result.files).toHaveLength(1);
      expect(result.files[0].filename).toBe('light.json');
      expect(result.files[0].collection).toBe('theme');
    });

    it('should return error when no sources defined', async () => {
      const config = {
        figma: { fileId: 'test', accessToken: 'test-token' },
        tokens: { dir: 'tokens', collections: {} },
      } as Config;

      const result = await resolveFromConfig(config);

      expect(result.error).toContain('No import sources defined');
      expect(result.files).toHaveLength(0);
    });

    it('should return error for non-existent source directory', async () => {
      const config = {
        figma: { fileId: 'test', accessToken: 'test-token' },
        tokens: { dir: 'tokens', collections: {} },
        import: {
          sources: {
            theme: {
              dir: '/nonexistent/path',
            },
          },
        },
      } as Config;

      const result = await resolveFromConfig(config);

      expect(result.error).toContain('directory not found');
      expect(result.files).toHaveLength(0);
    });
  });

  describe('resolveImportSources', () => {
    it('should use CLI path when provided', async () => {
      const result = await resolveImportSources(
        { path: resolve(TEST_DIR, 'single.tokens.json'), collection: 'cli-collection' },
        null
      );

      expect(result.error).toBeUndefined();
      expect(result.files).toHaveLength(1);
      expect(result.files[0].collection).toBe('cli-collection');
    });

    it('should fall back to config when no path provided', async () => {
      const config = {
        figma: { fileId: 'test', accessToken: 'test-token' },
        tokens: { dir: 'tokens', collections: {} },
        import: {
          sources: {
            theme: {
              dir: resolve(TEST_DIR, 'theme'),
            },
          },
        },
      } as Config;

      const result = await resolveImportSources({}, config);

      expect(result.error).toBeUndefined();
      expect(result.files).toHaveLength(2);
    });

    it('should return usage error when no path and no config', async () => {
      const result = await resolveImportSources({}, null);

      expect(result.error).toContain('No import source specified');
      expect(result.error).toContain('Usage:');
      expect(result.files).toHaveLength(0);
    });
  });
});
