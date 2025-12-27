import { describe, it, expect } from 'vitest';
import {
  buildBaselineKey,
  buildBaselineEntry,
  buildExportBaseline,
  type BaselineEntry,
} from './baseline-builder.js';
import type { ParsedToken } from './token-parser.js';
import type { DiscoveredFile } from './file-discoverer.js';

describe('baseline-builder', () => {
  describe('buildBaselineKey', () => {
    it('should build key with variableId when present', () => {
      const token: ParsedToken = {
        path: 'colors.primary',
        value: '#ff0000',
        type: 'color',
        variableId: 'VariableID:1:31',
      };

      const key = buildBaselineKey(token, 'theme', 'light');

      expect(key).toBe('VariableID:1:31:theme.light');
    });

    it('should build key with path when variableId is not present', () => {
      const token: ParsedToken = {
        path: 'colors.primary',
        value: '#ff0000',
        type: 'color',
      };

      const key = buildBaselineKey(token, 'theme', 'light');

      expect(key).toBe('colors.primary:theme.light');
    });

    it('should handle nested paths', () => {
      const token: ParsedToken = {
        path: 'colors.brand.primary.500',
        value: '#ff0000',
        type: 'color',
      };

      const key = buildBaselineKey(token, 'primitives', 'default');

      expect(key).toBe('colors.brand.primary.500:primitives.default');
    });

    it('should handle mode names with special characters', () => {
      const token: ParsedToken = {
        path: 'spacing.base',
        value: 8,
        type: 'dimension',
      };

      const key = buildBaselineKey(token, 'theme', 'high-contrast');

      expect(key).toBe('spacing.base:theme.high-contrast');
    });
  });

  describe('buildBaselineEntry', () => {
    it('should build entry with required fields', () => {
      const token: ParsedToken = {
        path: 'colors.primary',
        value: '#ff0000',
        type: 'color',
      };

      const entry = buildBaselineEntry(token, 'theme', 'light');

      expect(entry).toEqual({
        collection: 'theme',
        mode: 'light',
        path: 'colors.primary',
        value: '#ff0000',
        type: 'color',
      });
    });

    it('should include variableId when present', () => {
      const token: ParsedToken = {
        path: 'colors.primary',
        value: '#ff0000',
        type: 'color',
        variableId: 'VariableID:1:31',
      };

      const entry = buildBaselineEntry(token, 'theme', 'light');

      expect(entry.variableId).toBe('VariableID:1:31');
    });

    it('should include description when present', () => {
      const token: ParsedToken = {
        path: 'colors.primary',
        value: '#ff0000',
        type: 'color',
        description: 'Primary brand color',
      };

      const entry = buildBaselineEntry(token, 'theme', 'light');

      expect(entry.description).toBe('Primary brand color');
    });

    it('should include scopes when present', () => {
      const token: ParsedToken = {
        path: 'colors.primary',
        value: '#ff0000',
        type: 'color',
        scopes: ['FRAME_FILL', 'SHAPE_FILL'],
      };

      const entry = buildBaselineEntry(token, 'theme', 'light');

      expect(entry.scopes).toEqual(['FRAME_FILL', 'SHAPE_FILL']);
    });

    it('should not include scopes when empty array', () => {
      const token: ParsedToken = {
        path: 'colors.primary',
        value: '#ff0000',
        type: 'color',
        scopes: [],
      };

      const entry = buildBaselineEntry(token, 'theme', 'light');

      expect(entry.scopes).toBeUndefined();
    });

    it('should normalize dimension values by stripping units', () => {
      const token: ParsedToken = {
        path: 'spacing.base',
        value: '16px',
        type: 'dimension',
      };

      const entry = buildBaselineEntry(token, 'primitives', 'default');

      expect(entry.value).toBe(16);
    });

    it('should normalize rem dimension values', () => {
      const token: ParsedToken = {
        path: 'spacing.large',
        value: '1.5rem',
        type: 'dimension',
      };

      const entry = buildBaselineEntry(token, 'primitives', 'default');

      expect(entry.value).toBe(1.5);
    });

    it('should preserve numeric dimension values', () => {
      const token: ParsedToken = {
        path: 'spacing.base',
        value: 16,
        type: 'dimension',
      };

      const entry = buildBaselineEntry(token, 'primitives', 'default');

      expect(entry.value).toBe(16);
    });

    it('should preserve non-dimension string values', () => {
      const token: ParsedToken = {
        path: 'colors.primary',
        value: '#ff0000',
        type: 'color',
      };

      const entry = buildBaselineEntry(token, 'theme', 'light');

      expect(entry.value).toBe('#ff0000');
    });
  });

  describe('buildExportBaseline', () => {
    const createFile = (collection: string, splitBy: 'mode' | 'group' | 'none' = 'mode'): DiscoveredFile => ({
      path: `/path/to/${collection}.json`,
      filename: `${collection}.json`,
      collection,
      splitBy,
    });

    it('should build baseline from single file', () => {
      const parsedFiles = [
        {
          file: createFile('theme'),
          tokens: [
            { path: 'colors.primary', value: '#ff0000', type: 'color' },
            { path: 'colors.secondary', value: '#00ff00', type: 'color' },
          ],
          mode: 'light',
        },
      ];

      const result = buildExportBaseline(parsedFiles);

      expect(Object.keys(result.baseline)).toHaveLength(2);
      expect(result.baseline['colors.primary:theme.light']).toBeDefined();
      expect(result.baseline['colors.secondary:theme.light']).toBeDefined();
    });

    it('should build baseline from multiple files', () => {
      const parsedFiles = [
        {
          file: createFile('theme'),
          tokens: [{ path: 'colors.primary', value: '#fff', type: 'color' }],
          mode: 'light',
        },
        {
          file: createFile('theme'),
          tokens: [{ path: 'colors.primary', value: '#000', type: 'color' }],
          mode: 'dark',
        },
      ];

      const result = buildExportBaseline(parsedFiles);

      expect(Object.keys(result.baseline)).toHaveLength(2);
      expect(result.baseline['colors.primary:theme.light'].value).toBe('#fff');
      expect(result.baseline['colors.primary:theme.dark'].value).toBe('#000');
    });

    it('should build baseline from multiple collections', () => {
      const parsedFiles = [
        {
          file: createFile('theme'),
          tokens: [{ path: 'colors.bg', value: '#fff', type: 'color' }],
          mode: 'light',
        },
        {
          file: createFile('primitives'),
          tokens: [{ path: 'colors.red.500', value: '#ff0000', type: 'color' }],
          mode: 'default',
        },
      ];

      const result = buildExportBaseline(parsedFiles);

      expect(Object.keys(result.baseline)).toHaveLength(2);
      expect(result.baseline['colors.bg:theme.light']).toBeDefined();
      expect(result.baseline['colors.red.500:primitives.default']).toBeDefined();
    });

    it('should throw on duplicate tokens', () => {
      const parsedFiles = [
        {
          file: createFile('theme'),
          tokens: [
            { path: 'colors.primary', value: '#ff0000', type: 'color' },
            { path: 'colors.primary', value: '#00ff00', type: 'color' }, // Duplicate
          ],
          mode: 'light',
        },
      ];

      expect(() => buildExportBaseline(parsedFiles)).toThrow('Duplicate token');
    });

    it('should include metadata with source: export', () => {
      const parsedFiles = [
        {
          file: createFile('theme'),
          tokens: [{ path: 'a', value: 1, type: 'number' }],
          mode: 'default',
        },
      ];

      const result = buildExportBaseline(parsedFiles);

      expect(result.metadata.source).toBe('export');
      expect(result.metadata.syncedAt).toBeDefined();
    });

    it('should handle tokens with variableId', () => {
      const parsedFiles = [
        {
          file: createFile('theme'),
          tokens: [
            {
              path: 'colors.primary',
              value: '#ff0000',
              type: 'color',
              variableId: 'VariableID:1:31',
            },
          ],
          mode: 'light',
        },
      ];

      const result = buildExportBaseline(parsedFiles);

      const key = 'VariableID:1:31:theme.light';
      expect(result.baseline[key]).toBeDefined();
      expect(result.baseline[key].variableId).toBe('VariableID:1:31');
    });

    it('should handle empty parsed files', () => {
      const parsedFiles: Array<{ file: DiscoveredFile; tokens: ParsedToken[]; mode: string }> = [];

      const result = buildExportBaseline(parsedFiles);

      expect(Object.keys(result.baseline)).toHaveLength(0);
    });

    it('should handle files with no tokens', () => {
      const parsedFiles = [
        {
          file: createFile('theme'),
          tokens: [],
          mode: 'light',
        },
      ];

      const result = buildExportBaseline(parsedFiles);

      expect(Object.keys(result.baseline)).toHaveLength(0);
    });

    it('should preserve all token metadata', () => {
      const parsedFiles = [
        {
          file: createFile('theme'),
          tokens: [
            {
              path: 'colors.primary',
              value: '#ff0000',
              type: 'color',
              variableId: 'VariableID:1:31',
              description: 'Brand color',
              scopes: ['FRAME_FILL'],
            },
          ],
          mode: 'light',
        },
      ];

      const result = buildExportBaseline(parsedFiles);
      const entry = result.baseline['VariableID:1:31:theme.light'];

      expect(entry.description).toBe('Brand color');
      expect(entry.scopes).toEqual(['FRAME_FILL']);
    });
  });
});
