/**
 * File Writer Module Tests
 *
 * Tests for file writing operations during sync.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  writeTokenFiles,
  cleanupStaleFiles,
  writeStandaloneStyleFiles,
} from './file-writer.js';

// Mock fs operations
const mockMkdir = vi.fn().mockResolvedValue(undefined);
const mockWriteFile = vi.fn().mockResolvedValue(undefined);
const mockReaddir = vi.fn().mockResolvedValue([]);
const mockUnlink = vi.fn().mockResolvedValue(undefined);

vi.mock('node:fs/promises', () => ({
  mkdir: (...args: any[]) => mockMkdir(...args),
  writeFile: (...args: any[]) => mockWriteFile(...args),
  readdir: (...args: any[]) => mockReaddir(...args),
  unlink: (...args: any[]) => mockUnlink(...args),
}));

describe('file-writer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('writeTokenFiles', () => {
    it('should create directories and write files', async () => {
      const filesByDir = new Map<string, Map<string, any>>([
        ['/tokens', new Map([
          ['theme.light.json', { colors: { primary: '#007bff' } }],
          ['theme.dark.json', { colors: { primary: '#0056b3' } }],
        ])],
      ]);

      const count = await writeTokenFiles(filesByDir);

      expect(count).toBe(2);
      expect(mockMkdir).toHaveBeenCalledWith('/tokens', { recursive: true });
      expect(mockWriteFile).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple directories', async () => {
      const filesByDir = new Map<string, Map<string, any>>([
        ['/tokens/theme', new Map([
          ['light.json', { colors: {} }],
        ])],
        ['/tokens/globals', new Map([
          ['colors.json', { primary: '#fff' }],
        ])],
      ]);

      const count = await writeTokenFiles(filesByDir);

      expect(count).toBe(2);
      expect(mockMkdir).toHaveBeenCalledTimes(2);
    });

    it('should write JSON with 2-space indentation', async () => {
      const filesByDir = new Map<string, Map<string, any>>([
        ['/tokens', new Map([
          ['test.json', { key: 'value' }],
        ])],
      ]);

      await writeTokenFiles(filesByDir);

      expect(mockWriteFile).toHaveBeenCalledWith(
        '/tokens/test.json',
        JSON.stringify({ key: 'value' }, null, 2)
      );
    });
  });

  describe('cleanupStaleFiles', () => {
    it('should remove stale JSON files', async () => {
      mockReaddir.mockResolvedValue(['old.json', 'current.json', 'another.json']);

      const newFileNames = new Set(['current.json']);
      await cleanupStaleFiles('/tokens', newFileNames);

      expect(mockUnlink).toHaveBeenCalledTimes(2);
      expect(mockUnlink).toHaveBeenCalledWith('/tokens/old.json');
      expect(mockUnlink).toHaveBeenCalledWith('/tokens/another.json');
    });

    it('should not remove non-JSON files', async () => {
      mockReaddir.mockResolvedValue(['readme.md', 'old.json']);

      const newFileNames = new Set<string>();
      await cleanupStaleFiles('/tokens', newFileNames);

      expect(mockUnlink).toHaveBeenCalledTimes(1);
      expect(mockUnlink).toHaveBeenCalledWith('/tokens/old.json');
    });

    it('should handle directory not existing', async () => {
      mockReaddir.mockRejectedValue(new Error('ENOENT'));

      // Should not throw
      await expect(cleanupStaleFiles('/nonexistent', new Set())).resolves.not.toThrow();
    });
  });

  describe('writeStandaloneStyleFiles', () => {
    it('should write standalone style files', async () => {
      const styleFiles = [
        { fileName: 'paint-styles.json', content: { brand: '#ff0000' } },
        { fileName: 'text-styles.json', content: { heading: {} } },
      ];

      const count = await writeStandaloneStyleFiles(styleFiles, '/tokens');

      expect(count).toBe(2);
      expect(mockWriteFile).toHaveBeenCalledTimes(2);
    });

    it('should respect custom directory per file', async () => {
      const styleFiles = [
        { fileName: 'effects.json', content: {}, dir: 'custom/effects' },
      ];

      await writeStandaloneStyleFiles(styleFiles, '/tokens');

      // Should use custom directory
      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('custom/effects'),
        { recursive: true }
      );
    });

    it('should use default directory when dir not specified', async () => {
      const styleFiles = [
        { fileName: 'styles.json', content: {} },
      ];

      await writeStandaloneStyleFiles(styleFiles, '/tokens');

      expect(mockMkdir).toHaveBeenCalledWith('/tokens', { recursive: true });
    });
  });
});
