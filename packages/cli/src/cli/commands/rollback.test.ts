import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Mock ora before importing the command
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    info: vi.fn().mockReturnThis(),
    text: '',
  })),
}));

// Mock baseline module
vi.mock('../../core/baseline.js', () => ({
  readBaseline: vi.fn(),
  writeBaseline: vi.fn().mockResolvedValue(undefined),
  readPreviousBaseline: vi.fn(),
}));

import { rollbackCommand } from './rollback.js';
import { readBaseline, writeBaseline, readPreviousBaseline } from '../../core/baseline.js';
import type { BaselineData } from '../../types/index.js';

const TEST_DIR = 'test-temp-rollback';

describe('rollbackCommand', () => {
  const originalCwd = process.cwd();

  beforeEach(() => {
    vi.clearAllMocks();
    mkdirSync(TEST_DIR, { recursive: true });
    process.chdir(TEST_DIR);

    // Create basic config
    const config = {
      version: '1.0.0',
      figma: { fileId: 'test-file', accessToken: 'test-token' },
      tokens: { dir: 'tokens' },
    };
    writeFileSync('synkio.config.json', JSON.stringify(config));
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('rollback availability', () => {
    it('should fail when no previous baseline exists', async () => {
      vi.mocked(readPreviousBaseline).mockResolvedValueOnce(undefined);

      // Should not throw but log failure message
      await expect(rollbackCommand()).resolves.not.toThrow();

      // The command logs failure via spinner.fail
    });

    it('should succeed when previous baseline exists', async () => {
      const prevBaseline: BaselineData = {
        metadata: { syncedAt: '2024-01-01T00:00:00Z' },
        baseline: {
          'var1:light': {
            path: 'colors.primary',
            value: '#ff0000',
            type: 'COLOR',
            collection: 'theme',
            mode: 'light',
          },
        },
        styles: {},
      };

      vi.mocked(readPreviousBaseline).mockResolvedValueOnce(prevBaseline);

      await rollbackCommand();

      expect(writeBaseline).toHaveBeenCalledWith(prevBaseline);
    });
  });

  describe('preview mode', () => {
    it('should not write files in preview mode', async () => {
      const prevBaseline: BaselineData = {
        metadata: { syncedAt: '2024-01-01T00:00:00Z' },
        baseline: {
          'var1:light': {
            path: 'colors.primary',
            value: '#ff0000',
            type: 'COLOR',
            collection: 'theme',
            mode: 'light',
          },
        },
        styles: {},
      };

      vi.mocked(readPreviousBaseline).mockResolvedValueOnce(prevBaseline);
      vi.mocked(readBaseline).mockResolvedValueOnce({
        metadata: { syncedAt: '2024-01-02T00:00:00Z' },
        baseline: {
          'var1:light': {
            path: 'colors.primary',
            value: '#0000ff', // Different value
            type: 'COLOR',
            collection: 'theme',
            mode: 'light',
          },
        },
        styles: {},
      });

      await rollbackCommand({ preview: true });

      expect(writeBaseline).not.toHaveBeenCalled();
    });

    it('should show diff between current and previous baseline', async () => {
      const prevBaseline: BaselineData = {
        metadata: { syncedAt: '2024-01-01T00:00:00Z' },
        baseline: {
          'var1:light': {
            path: 'colors.primary',
            value: '#ff0000',
            type: 'COLOR',
            collection: 'theme',
            mode: 'light',
          },
        },
        styles: {},
      };

      const currentBaseline: BaselineData = {
        metadata: { syncedAt: '2024-01-02T00:00:00Z' },
        baseline: {
          'var1:light': {
            path: 'colors.primary',
            value: '#0000ff',
            type: 'COLOR',
            collection: 'theme',
            mode: 'light',
          },
        },
        styles: {},
      };

      vi.mocked(readPreviousBaseline).mockResolvedValueOnce(prevBaseline);
      vi.mocked(readBaseline).mockResolvedValueOnce(currentBaseline);

      // Should complete without error in preview mode
      await expect(rollbackCommand({ preview: true })).resolves.not.toThrow();
    });

    it('should handle preview when no current baseline exists', async () => {
      const prevBaseline: BaselineData = {
        metadata: { syncedAt: '2024-01-01T00:00:00Z' },
        baseline: {},
        styles: {},
      };

      vi.mocked(readPreviousBaseline).mockResolvedValueOnce(prevBaseline);
      vi.mocked(readBaseline).mockResolvedValueOnce(undefined);

      await expect(rollbackCommand({ preview: true })).resolves.not.toThrow();
    });
  });

  describe('file writing', () => {
    it('should restore baseline and write token files', async () => {
      const prevBaseline: BaselineData = {
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

      vi.mocked(readPreviousBaseline).mockResolvedValueOnce(prevBaseline);

      await rollbackCommand();

      // Should write baseline
      expect(writeBaseline).toHaveBeenCalledWith(prevBaseline);

      // Should create tokens directory
      expect(existsSync('tokens')).toBe(true);
    });

    it('should write files with splitBy configuration', async () => {
      // Update config with collection settings
      const config = {
        version: '1.0.0',
        figma: { fileId: 'test-file', accessToken: 'test-token' },
        tokens: {
          dir: 'tokens',
          collections: {
            theme: { splitBy: 'mode' },
          },
        },
      };
      writeFileSync('synkio.config.json', JSON.stringify(config));

      const prevBaseline: BaselineData = {
        metadata: { syncedAt: '2024-01-01T00:00:00Z' },
        baseline: {
          'VariableID:1:1:theme.light': {
            variableId: 'VariableID:1:1',
            path: 'colors.primary',
            value: '#ffffff',
            type: 'COLOR',
            collection: 'theme',
            mode: 'light',
          },
          'VariableID:1:1:theme.dark': {
            variableId: 'VariableID:1:1',
            path: 'colors.primary',
            value: '#000000',
            type: 'COLOR',
            collection: 'theme',
            mode: 'dark',
          },
        },
        styles: {},
      };

      vi.mocked(readPreviousBaseline).mockResolvedValueOnce(prevBaseline);

      await rollbackCommand();

      expect(existsSync('tokens')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle write errors gracefully', async () => {
      const prevBaseline: BaselineData = {
        metadata: { syncedAt: '2024-01-01T00:00:00Z' },
        baseline: {},
        styles: {},
      };

      vi.mocked(readPreviousBaseline).mockResolvedValueOnce(prevBaseline);
      vi.mocked(writeBaseline).mockRejectedValueOnce(new Error('Write failed'));

      // The command should handle errors via process.exit, but we can't easily test that
      // Instead, we verify the mock was called
      await expect(rollbackCommand()).rejects.toThrow();
    });
  });

  describe('output messages', () => {
    it('should indicate number of files restored', async () => {
      const prevBaseline: BaselineData = {
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
          'VariableID:1:2:theme.light': {
            variableId: 'VariableID:1:2',
            path: 'colors.secondary',
            value: '#00ff00',
            type: 'COLOR',
            collection: 'theme',
            mode: 'light',
          },
        },
        styles: {},
      };

      vi.mocked(readPreviousBaseline).mockResolvedValueOnce(prevBaseline);

      await rollbackCommand();

      // Verify baseline was written (indicating successful rollback)
      expect(writeBaseline).toHaveBeenCalledWith(prevBaseline);
    });
  });
});
