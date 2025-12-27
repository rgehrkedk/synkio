import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { BaselineData } from '../types/index.js';

const TEST_DIR = 'test-temp-baseline';
const SYNKIO_DIR = '.synkio';

/**
 * These tests use dynamic imports to ensure the baseline module
 * picks up the correct cwd after we change directories.
 * The baseline module computes paths at load time using process.cwd().
 */
describe('baseline', () => {
  const originalCwd = process.cwd();

  beforeEach(() => {
    // Clear module cache to ensure fresh imports with correct cwd
    vi.resetModules();
    mkdirSync(TEST_DIR, { recursive: true });
    process.chdir(TEST_DIR);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('readBaseline', () => {
    it('should return undefined when no baseline exists', async () => {
      const { readBaseline } = await import('./baseline.js');
      const result = await readBaseline();
      expect(result).toBeUndefined();
    });

    it('should read existing baseline file', async () => {
      const baseline: BaselineData = {
        metadata: { syncedAt: '2024-01-01T00:00:00Z' },
        baseline: {
          'var1:light': {
            path: 'colors.primary',
            value: '#fff',
            type: 'COLOR',
            collection: 'theme',
            mode: 'light',
          },
        },
        styles: {},
      };

      mkdirSync(SYNKIO_DIR, { recursive: true });
      writeFileSync(
        resolve(SYNKIO_DIR, 'baseline.json'),
        JSON.stringify(baseline, null, 2)
      );

      const { readBaseline } = await import('./baseline.js');
      const result = await readBaseline();
      expect(result).toEqual(baseline);
    });

    it('should throw on malformed JSON', async () => {
      mkdirSync(SYNKIO_DIR, { recursive: true });
      writeFileSync(resolve(SYNKIO_DIR, 'baseline.json'), '{ invalid json }');

      const { readBaseline } = await import('./baseline.js');
      await expect(readBaseline()).rejects.toThrow();
    });
  });

  describe('writeBaseline', () => {
    it('should create .synkio directory if it does not exist', async () => {
      const baseline: BaselineData = {
        metadata: { syncedAt: '2024-01-01T00:00:00Z' },
        baseline: {},
        styles: {},
      };

      const { writeBaseline } = await import('./baseline.js');
      await writeBaseline(baseline);

      const content = readFileSync(
        resolve(SYNKIO_DIR, 'baseline.json'),
        'utf-8'
      );
      expect(JSON.parse(content)).toEqual(baseline);
    });

    it('should write baseline with proper formatting', async () => {
      const baseline: BaselineData = {
        metadata: { syncedAt: '2024-01-01T00:00:00Z' },
        baseline: {
          'var1:light': {
            path: 'colors.primary',
            value: '#fff',
            type: 'COLOR',
            collection: 'theme',
            mode: 'light',
          },
        },
        styles: {},
      };

      const { writeBaseline } = await import('./baseline.js');
      await writeBaseline(baseline);

      const content = readFileSync(
        resolve(SYNKIO_DIR, 'baseline.json'),
        'utf-8'
      );
      // Should be formatted with 2-space indent
      expect(content).toContain('\n  ');
      expect(JSON.parse(content)).toEqual(baseline);
    });

    it('should backup current baseline before writing new one', async () => {
      const oldBaseline: BaselineData = {
        metadata: { syncedAt: '2024-01-01T00:00:00Z' },
        baseline: { old: { path: 'old', value: 1, type: 'NUMBER', collection: 'c', mode: 'm' } },
        styles: {},
      };

      const newBaseline: BaselineData = {
        metadata: { syncedAt: '2024-01-02T00:00:00Z' },
        baseline: { new: { path: 'new', value: 2, type: 'NUMBER', collection: 'c', mode: 'm' } },
        styles: {},
      };

      const { writeBaseline } = await import('./baseline.js');

      // Write initial baseline
      await writeBaseline(oldBaseline);

      // Write new baseline (should backup old)
      await writeBaseline(newBaseline);

      // Check current baseline is new
      const current = readFileSync(
        resolve(SYNKIO_DIR, 'baseline.json'),
        'utf-8'
      );
      expect(JSON.parse(current)).toEqual(newBaseline);

      // Check previous baseline contains old
      const prev = readFileSync(
        resolve(SYNKIO_DIR, 'baseline.prev.json'),
        'utf-8'
      );
      expect(JSON.parse(prev)).toEqual(oldBaseline);
    });

    it('should handle first write without previous baseline', async () => {
      const baseline: BaselineData = {
        metadata: { syncedAt: '2024-01-01T00:00:00Z' },
        baseline: {},
        styles: {},
      };

      const { writeBaseline } = await import('./baseline.js');

      // Should not throw when no previous baseline exists
      await expect(writeBaseline(baseline)).resolves.not.toThrow();
    });
  });

  describe('readPreviousBaseline', () => {
    it('should return undefined when no previous baseline exists', async () => {
      const { readPreviousBaseline } = await import('./baseline.js');
      const result = await readPreviousBaseline();
      expect(result).toBeUndefined();
    });

    it('should read previous baseline file', async () => {
      const prevBaseline: BaselineData = {
        metadata: { syncedAt: '2024-01-01T00:00:00Z' },
        baseline: {
          'var1:light': {
            path: 'colors.primary',
            value: '#fff',
            type: 'COLOR',
            collection: 'theme',
            mode: 'light',
          },
        },
        styles: {},
      };

      mkdirSync(SYNKIO_DIR, { recursive: true });
      writeFileSync(
        resolve(SYNKIO_DIR, 'baseline.prev.json'),
        JSON.stringify(prevBaseline, null, 2)
      );

      const { readPreviousBaseline } = await import('./baseline.js');
      const result = await readPreviousBaseline();
      expect(result).toEqual(prevBaseline);
    });

    it('should correctly read previous baseline after multiple writes', async () => {
      const baseline1: BaselineData = {
        metadata: { syncedAt: '2024-01-01T00:00:00Z' },
        baseline: { v: { path: 'a', value: 1, type: 'NUMBER', collection: 'c', mode: 'm' } },
        styles: {},
      };

      const baseline2: BaselineData = {
        metadata: { syncedAt: '2024-01-02T00:00:00Z' },
        baseline: { v: { path: 'a', value: 2, type: 'NUMBER', collection: 'c', mode: 'm' } },
        styles: {},
      };

      const baseline3: BaselineData = {
        metadata: { syncedAt: '2024-01-03T00:00:00Z' },
        baseline: { v: { path: 'a', value: 3, type: 'NUMBER', collection: 'c', mode: 'm' } },
        styles: {},
      };

      const { writeBaseline, readBaseline, readPreviousBaseline } = await import('./baseline.js');

      await writeBaseline(baseline1);
      await writeBaseline(baseline2);
      await writeBaseline(baseline3);

      // Previous should be baseline2 (the one before the last write)
      const prev = await readPreviousBaseline();
      expect(prev).toEqual(baseline2);

      // Current should be baseline3
      const current = await readBaseline();
      expect(current).toEqual(baseline3);
    });
  });
});
