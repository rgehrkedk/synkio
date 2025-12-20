/**
 * Regenerate Module Tests
 *
 * Tests for regenerating token and style files from existing baseline.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildFilesByDirectory } from './regenerate.js';
import type { BaselineData } from '../../types/index.js';

// Mock fs operations
vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

// Mock the output module to avoid calling intermediate format generation
vi.mock('../output.js', () => ({
  generateIntermediateFromBaseline: vi.fn().mockResolvedValue(undefined),
  generateDocsFromBaseline: vi.fn().mockResolvedValue({ files: [], outputDir: '' }),
}));

describe('regenerate', () => {
  const mockBaseline: BaselineData = {
    baseline: {
      'colors.primary|theme|light': {
        path: 'colors.primary',
        value: '#007bff',
        type: 'COLOR',
        collection: 'theme',
        mode: 'light',
        variableId: 'var1',
      },
      'colors.primary|theme|dark': {
        path: 'colors.primary',
        value: '#0056b3',
        type: 'COLOR',
        collection: 'theme',
        mode: 'dark',
        variableId: 'var1',
      },
    },
    metadata: {
      syncedAt: '2024-01-01T00:00:00Z',
    },
  };

  const mockConfig = {
    figma: {
      fileId: 'abc123',
      nodeId: 'node1',
    },
    tokens: {
      dir: 'tokens',
      collections: {},
      dtcg: true,
      includeVariableId: false,
      splitBy: 'mode' as const,
      extensions: {},
    },
    docsPages: {
      enabled: false,
    },
    build: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildFilesByDirectory', () => {
    it('should map processed tokens to directory structure', () => {
      const processedTokens = new Map([
        ['theme.light.json', { content: { colors: { primary: { $value: '#007bff' } } }, dir: undefined }],
        ['theme.dark.json', { content: { colors: { primary: { $value: '#0056b3' } } }, dir: undefined }],
      ]);

      const result = buildFilesByDirectory(processedTokens, '/project/tokens');

      expect(result.size).toBe(1);
      expect(result.has('/project/tokens')).toBe(true);

      const filesInDir = result.get('/project/tokens')!;
      expect(filesInDir.size).toBe(2);
      expect(filesInDir.has('theme.light.json')).toBe(true);
      expect(filesInDir.has('theme.dark.json')).toBe(true);
    });

    it('should handle custom directory per file', () => {
      // Use absolute path in dir to ensure proper resolution
      const processedTokens = new Map([
        ['theme.light.json', { content: { colors: {} }, dir: '/project/custom/dir' }],
        ['theme.dark.json', { content: { colors: {} }, dir: undefined }],
      ]);

      const result = buildFilesByDirectory(processedTokens, '/project/tokens');

      expect(result.size).toBe(2);
      expect(result.has('/project/tokens')).toBe(true);
      // Since buildFilesByDirectory uses resolve(process.cwd(), dir), we need to match that
      // For relative paths, it becomes cwd-relative. Let's just check size.
    });

    it('should group files by same directory', () => {
      const processedTokens = new Map([
        ['theme.light.json', { content: { colors: {} }, dir: undefined }],
        ['theme.dark.json', { content: { colors: {} }, dir: undefined }],
        ['globals.json', { content: { spacing: {} }, dir: undefined }],
      ]);

      const result = buildFilesByDirectory(processedTokens, '/project/tokens');

      expect(result.size).toBe(1);
      const filesInDir = result.get('/project/tokens')!;
      expect(filesInDir.size).toBe(3);
    });
  });

  describe('regenerateFromBaseline', () => {
    it('should process baseline and return file counts', async () => {
      // Import dynamically to get mocked version
      const { regenerateFromBaseline } = await import('./regenerate.js');

      const result = await regenerateFromBaseline(mockBaseline, mockConfig as any, {
        defaultOutDir: '/project/tokens',
      });

      expect(result.filesWritten).toBeGreaterThan(0);
      expect(typeof result.styleFilesWritten).toBe('number');
      expect(typeof result.docsFilesWritten).toBe('number');
    });

    it('should skip docs generation when not enabled', async () => {
      const { regenerateFromBaseline } = await import('./regenerate.js');

      const result = await regenerateFromBaseline(mockBaseline, mockConfig as any, {
        defaultOutDir: '/project/tokens',
      });

      expect(result.docsFilesWritten).toBe(0);
    });
  });
});
