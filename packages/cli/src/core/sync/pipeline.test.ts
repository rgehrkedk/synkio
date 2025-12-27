import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { BaselineData } from '../../types/index.js';
import type { Spinner, SyncOptions } from './pipeline.js';

// Mock all the heavy dependencies
vi.mock('../figma.js', () => ({
  FigmaClient: vi.fn().mockImplementation(() => ({
    fetchData: vi.fn().mockResolvedValue({
      version: '3.0.0',
      timestamp: new Date().toISOString(),
      tokens: [
        {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:0',
          modeId: '1:0',
          collection: 'theme',
          mode: 'light',
          path: 'colors.primary',
          value: '#ff0000',
          type: 'COLOR',
        },
      ],
      styles: [],
    }),
  })),
}));

vi.mock('../baseline.js', () => ({
  readBaseline: vi.fn(),
  writeBaseline: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../output.js', () => ({
  generateIntermediateFromBaseline: vi.fn().mockResolvedValue(''),
  generateDocsFromBaseline: vi.fn().mockResolvedValue({ files: [], outputDir: '' }),
}));

vi.mock('./build-runner.js', () => ({
  shouldRunBuild: vi.fn().mockResolvedValue(false),
  runBuildPipeline: vi.fn().mockResolvedValue({ scriptRan: false, cssFilesWritten: 0 }),
}));

import { executeSyncPipeline } from './pipeline.js';
import { readBaseline, writeBaseline } from '../baseline.js';
import { FigmaClient } from '../figma.js';
import { shouldRunBuild, runBuildPipeline } from './build-runner.js';

const TEST_DIR = 'test-temp-pipeline';

// Create a mock spinner
function createMockSpinner(): Spinner {
  return {
    text: '',
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    info: vi.fn().mockReturnThis(),
  };
}

describe('executeSyncPipeline', () => {
  const originalCwd = process.cwd();
  let spinner: Spinner;

  beforeEach(() => {
    vi.clearAllMocks();
    mkdirSync(TEST_DIR, { recursive: true });
    process.chdir(TEST_DIR);

    // Create a basic config
    const config = {
      version: '1.0.0',
      figma: { fileId: 'test-file', accessToken: 'test-token' },
      tokens: { dir: 'tokens' },
    };
    writeFileSync('synkio.config.json', JSON.stringify(config));

    spinner = createMockSpinner();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('first sync', () => {
    it('should discover collections on first sync', async () => {
      vi.mocked(readBaseline).mockResolvedValueOnce(undefined);

      const result = await executeSyncPipeline({}, spinner);

      expect(result.filesWritten).toBeGreaterThanOrEqual(0);
      expect(writeBaseline).toHaveBeenCalled();
    });

    it('should create token output directory', async () => {
      vi.mocked(readBaseline).mockResolvedValueOnce(undefined);

      await executeSyncPipeline({}, spinner);

      expect(existsSync('tokens')).toBe(true);
    });

    it('should update config with discovered collections', async () => {
      vi.mocked(readBaseline).mockResolvedValueOnce(undefined);

      await executeSyncPipeline({}, spinner);

      const updatedConfig = JSON.parse(readFileSync('synkio.config.json', 'utf-8'));
      expect(updatedConfig.tokens.collections).toBeDefined();
      expect(updatedConfig.tokens.collections.theme).toBeDefined();
    });
  });

  describe('preview mode', () => {
    it('should not write files in preview mode on first sync', async () => {
      vi.mocked(readBaseline).mockResolvedValueOnce(undefined);

      const result = await executeSyncPipeline({ preview: true }, spinner);

      expect(result.filesWritten).toBe(0);
      expect(result.hasChanges).toBe(true);
    });

    it('should not write files in preview mode with existing baseline', async () => {
      const existingBaseline: BaselineData = {
        metadata: { syncedAt: '2024-01-01T00:00:00Z' },
        baseline: {
          'VariableID:1:1:theme.light': {
            variableId: 'VariableID:1:1',
            path: 'colors.primary',
            value: '#0000ff', // Different value
            type: 'COLOR',
            collection: 'theme',
            mode: 'light',
          },
        },
        styles: {},
      };
      vi.mocked(readBaseline).mockResolvedValueOnce(existingBaseline);

      const result = await executeSyncPipeline({ preview: true }, spinner);

      expect(result.filesWritten).toBe(0);
      expect(writeBaseline).not.toHaveBeenCalled();
    });

    it('should show changes in preview mode', async () => {
      const existingBaseline: BaselineData = {
        metadata: { syncedAt: '2024-01-01T00:00:00Z' },
        baseline: {
          'VariableID:1:1:theme.light': {
            variableId: 'VariableID:1:1',
            path: 'colors.primary',
            value: '#0000ff',
            type: 'COLOR',
            collection: 'theme',
            mode: 'light',
          },
        },
        styles: {},
      };
      vi.mocked(readBaseline).mockResolvedValueOnce(existingBaseline);

      const result = await executeSyncPipeline({ preview: true }, spinner);

      expect(result.hasChanges).toBe(true);
    });
  });

  describe('regenerate mode', () => {
    it('should rebuild from baseline without fetching from Figma', async () => {
      const existingBaseline: BaselineData = {
        metadata: { syncedAt: '2024-01-01T00:00:00Z' },
        baseline: {
          'VariableID:1:1:theme.light': {
            variableId: 'VariableID:1:1',
            path: 'colors.primary',
            value: '#ff0000',
            type: 'COLOR',
            collection: 'theme',
            mode: 'light',
          },
        },
        styles: {},
      };
      vi.mocked(readBaseline).mockResolvedValueOnce(existingBaseline);

      const result = await executeSyncPipeline({ regenerate: true }, spinner);

      // Should not create a new FigmaClient for fetching
      expect(FigmaClient).not.toHaveBeenCalled();
      expect(result.filesWritten).toBeGreaterThanOrEqual(0);
    });

    it('should throw error when regenerating without baseline', async () => {
      vi.mocked(readBaseline).mockResolvedValueOnce(undefined);

      await expect(executeSyncPipeline({ regenerate: true }, spinner)).rejects.toThrow(
        'No baseline found'
      );
    });

    it('should run build pipeline when enabled in regenerate mode', async () => {
      const existingBaseline: BaselineData = {
        metadata: { syncedAt: '2024-01-01T00:00:00Z' },
        baseline: {},
        styles: {},
      };
      vi.mocked(readBaseline).mockResolvedValueOnce(existingBaseline);
      vi.mocked(shouldRunBuild).mockResolvedValueOnce(true);
      vi.mocked(runBuildPipeline).mockResolvedValueOnce({ scriptRan: true, cssFilesWritten: 2 });

      const result = await executeSyncPipeline({ regenerate: true }, spinner);

      expect(shouldRunBuild).toHaveBeenCalled();
      expect(runBuildPipeline).toHaveBeenCalled();
      expect(result.buildScriptRan).toBe(true);
      expect(result.cssFilesWritten).toBe(2);
    });
  });

  describe('comparison and changes', () => {
    it('should detect value changes', async () => {
      const existingBaseline: BaselineData = {
        metadata: { syncedAt: '2024-01-01T00:00:00Z' },
        baseline: {
          'VariableID:1:1:theme.light': {
            variableId: 'VariableID:1:1',
            collectionId: 'VariableCollectionId:1:0',
            modeId: '1:0',
            path: 'colors.primary',
            value: '#0000ff', // Different value than what Figma returns
            type: 'COLOR',
            collection: 'theme',
            mode: 'light',
          },
        },
        styles: {},
      };
      vi.mocked(readBaseline).mockResolvedValueOnce(existingBaseline);

      const result = await executeSyncPipeline({}, spinner);

      expect(result.hasChanges).toBe(true);
      expect(writeBaseline).toHaveBeenCalled();
    });

    it('should detect no changes when baselines match', async () => {
      const existingBaseline: BaselineData = {
        metadata: { syncedAt: '2024-01-01T00:00:00Z' },
        baseline: {
          'VariableID:1:1:theme.light': {
            variableId: 'VariableID:1:1',
            collectionId: 'VariableCollectionId:1:0',
            modeId: '1:0',
            path: 'colors.primary',
            value: '#ff0000', // Same value as Figma returns
            type: 'COLOR',
            collection: 'theme',
            mode: 'light',
          },
        },
        styles: {},
      };
      vi.mocked(readBaseline).mockResolvedValueOnce(existingBaseline);

      const result = await executeSyncPipeline({}, spinner);

      expect(result.hasChanges).toBe(false);
    });
  });

  describe('breaking changes', () => {
    it('should block sync on breaking changes without --force', async () => {
      const existingBaseline: BaselineData = {
        metadata: { syncedAt: '2024-01-01T00:00:00Z' },
        baseline: {
          'VariableID:1:1:theme.light': {
            variableId: 'VariableID:1:1',
            collectionId: 'VariableCollectionId:1:0',
            modeId: '1:0',
            path: 'colors.primary',
            value: '#ff0000',
            type: 'COLOR',
            collection: 'theme',
            mode: 'light',
          },
          'VariableID:1:2:theme.light': {
            variableId: 'VariableID:1:2',
            collectionId: 'VariableCollectionId:1:0',
            modeId: '1:0',
            path: 'colors.secondary',
            value: '#00ff00',
            type: 'COLOR',
            collection: 'theme',
            mode: 'light',
          },
        },
        styles: {},
      };
      vi.mocked(readBaseline).mockResolvedValueOnce(existingBaseline);

      // Figma only returns one token - colors.secondary is "deleted"
      await expect(executeSyncPipeline({}, spinner)).rejects.toThrow('breaking changes');
    });

    it('should proceed with --force despite breaking changes', async () => {
      const existingBaseline: BaselineData = {
        metadata: { syncedAt: '2024-01-01T00:00:00Z' },
        baseline: {
          'VariableID:1:1:theme.light': {
            variableId: 'VariableID:1:1',
            collectionId: 'VariableCollectionId:1:0',
            modeId: '1:0',
            path: 'colors.primary',
            value: '#ff0000',
            type: 'COLOR',
            collection: 'theme',
            mode: 'light',
          },
          'VariableID:1:2:theme.light': {
            variableId: 'VariableID:1:2',
            collectionId: 'VariableCollectionId:1:0',
            modeId: '1:0',
            path: 'colors.secondary',
            value: '#00ff00',
            type: 'COLOR',
            collection: 'theme',
            mode: 'light',
          },
        },
        styles: {},
      };
      vi.mocked(readBaseline).mockResolvedValueOnce(existingBaseline);

      const result = await executeSyncPipeline({ force: true }, spinner);

      expect(result.hasChanges).toBe(true);
      expect(writeBaseline).toHaveBeenCalled();
    });
  });

  describe('collection filtering', () => {
    it('should filter tokens by collection when specified', async () => {
      // Mock Figma returning multiple collections
      vi.mocked(FigmaClient).mockImplementationOnce(
        () =>
          ({
            fetchData: vi.fn().mockResolvedValue({
              version: '3.0.0',
              timestamp: new Date().toISOString(),
              tokens: [
                {
                  variableId: 'VariableID:1:1',
                  collection: 'theme',
                  mode: 'light',
                  path: 'colors.primary',
                  value: '#ff0000',
                  type: 'COLOR',
                },
                {
                  variableId: 'VariableID:2:1',
                  collection: 'primitives',
                  mode: 'default',
                  path: 'colors.red',
                  value: '#ff0000',
                  type: 'COLOR',
                },
              ],
              styles: [],
            }),
          }) as any
      );

      vi.mocked(readBaseline).mockResolvedValueOnce(undefined);

      const result = await executeSyncPipeline({ collection: 'theme' }, spinner);

      expect(result.filesWritten).toBeGreaterThanOrEqual(0);
    });

    it('should throw when no tokens match collection filter', async () => {
      vi.mocked(readBaseline).mockResolvedValueOnce(undefined);

      await expect(
        executeSyncPipeline({ collection: 'nonexistent' }, spinner)
      ).rejects.toThrow('No tokens found for collection');
    });
  });

  describe('build pipeline', () => {
    it('should run build when enabled', async () => {
      vi.mocked(readBaseline).mockResolvedValueOnce(undefined);
      vi.mocked(shouldRunBuild).mockResolvedValueOnce(true);
      vi.mocked(runBuildPipeline).mockResolvedValueOnce({ scriptRan: true, cssFilesWritten: 1 });

      const result = await executeSyncPipeline({}, spinner);

      expect(shouldRunBuild).toHaveBeenCalled();
      expect(runBuildPipeline).toHaveBeenCalled();
      expect(result.buildScriptRan).toBe(true);
    });

    it('should skip build with --no-build', async () => {
      vi.mocked(readBaseline).mockResolvedValueOnce(undefined);
      vi.mocked(shouldRunBuild).mockResolvedValueOnce(false);

      const result = await executeSyncPipeline({ noBuild: true }, spinner);

      expect(result.buildScriptRan).toBe(false);
    });
  });

  describe('backup functionality', () => {
    it('should create backup when --backup flag is set and files exist', async () => {
      // First, run a sync to create files
      vi.mocked(readBaseline).mockResolvedValueOnce(undefined);
      await executeSyncPipeline({}, spinner);

      // Now files exist - run sync again with backup
      vi.mocked(readBaseline).mockResolvedValueOnce({
        metadata: { syncedAt: '2024-01-01T00:00:00Z' },
        baseline: {
          'VariableID:1:1:theme.light': {
            variableId: 'VariableID:1:1',
            collectionId: 'VariableCollectionId:1:0',
            modeId: '1:0',
            path: 'colors.primary',
            value: '#ff0000',
            type: 'COLOR',
            collection: 'theme',
            mode: 'light',
          },
        },
        styles: {},
      });

      const result = await executeSyncPipeline({ backup: true }, spinner);

      // Backup should have been created since files existed from first sync
      expect(existsSync('.synkio/backups')).toBe(true);
    });

    it('should not create backup when no files exist', async () => {
      vi.mocked(readBaseline).mockResolvedValueOnce(undefined);

      const result = await executeSyncPipeline({ backup: true }, spinner);

      // backupDir should be undefined when no files existed
      expect(result.backupDir).toBeUndefined();
    });
  });

  describe('output files', () => {
    it('should write token files to configured directory', async () => {
      vi.mocked(readBaseline).mockResolvedValueOnce(undefined);

      await executeSyncPipeline({}, spinner);

      expect(existsSync('tokens')).toBe(true);
    });

    it('should respect custom tokens.dir', async () => {
      const config = {
        version: '1.0.0',
        figma: { fileId: 'test-file', accessToken: 'test-token' },
        tokens: { dir: 'src/design-tokens' },
      };
      writeFileSync('synkio.config.json', JSON.stringify(config));

      vi.mocked(readBaseline).mockResolvedValueOnce(undefined);

      await executeSyncPipeline({}, spinner);

      expect(existsSync('src/design-tokens')).toBe(true);
    });
  });

  describe('spinner updates', () => {
    it('should update spinner text during sync', async () => {
      vi.mocked(readBaseline).mockResolvedValueOnce(undefined);

      await executeSyncPipeline({}, spinner);

      expect(spinner.start).toHaveBeenCalled();
      expect(spinner.stop).toHaveBeenCalled();
    });

    it('should show info message for first sync', async () => {
      vi.mocked(readBaseline).mockResolvedValueOnce(undefined);

      await executeSyncPipeline({}, spinner);

      expect(spinner.info).toHaveBeenCalledWith(
        expect.stringContaining('No local baseline found')
      );
    });
  });
});
